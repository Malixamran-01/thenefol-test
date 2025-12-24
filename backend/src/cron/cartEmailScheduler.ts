// Cart Email Scheduler Cron Job - Sends scheduled cart reminder emails
import cron from 'node-cron'
import { Pool } from 'pg'
import { sendCartAddedEmail } from '../services/emailService'

export function startCartEmailSchedulerCron(pool: Pool): void {
  // Run every 5 minutes to check for scheduled emails
  cron.schedule('*/5 * * * *', async () => {
    try {
      console.log('📧 Running cart email scheduler check...')
      
      // Ensure table exists
      await pool.query(`
        CREATE TABLE IF NOT EXISTS pending_cart_emails (
          id SERIAL PRIMARY KEY,
          user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          user_email TEXT NOT NULL,
          user_name TEXT NOT NULL,
          product_name TEXT NOT NULL,
          product_price NUMERIC(10,2) NOT NULL,
          scheduled_send_at TIMESTAMPTZ NOT NULL,
          sent BOOLEAN DEFAULT FALSE,
          sent_at TIMESTAMPTZ,
          created_at TIMESTAMPTZ DEFAULT NOW()
        );
        CREATE INDEX IF NOT EXISTS idx_pending_cart_emails_scheduled ON pending_cart_emails(scheduled_send_at, sent);
        CREATE INDEX IF NOT EXISTS idx_pending_cart_emails_user ON pending_cart_emails(user_id);
      `)
      
      // Get emails that are scheduled to be sent now or in the past and haven't been sent yet
      const now = new Date()
      const pendingEmails = await pool.query(`
        SELECT id, user_id, user_email, user_name, product_name, product_price
        FROM pending_cart_emails
        WHERE scheduled_send_at <= $1
          AND sent = FALSE
        ORDER BY scheduled_send_at ASC
        LIMIT 50
      `, [now])
      
      console.log(`📧 Found ${pendingEmails.rows.length} scheduled cart emails to send`)
      
      for (const emailData of pendingEmails.rows) {
        try {
          // Check if user still has items in cart (don't send if cart is empty)
          const cartItems = await pool.query(`
            SELECT COUNT(*) as count FROM cart WHERE user_id = $1
          `, [emailData.user_id])
          
          if (parseInt(cartItems.rows[0].count) > 0) {
            // Send the email
            await sendCartAddedEmail(
              emailData.user_email,
              emailData.user_name,
              emailData.product_name,
              parseFloat(emailData.product_price.toString())
            )
            
            // Mark as sent
            await pool.query(`
              UPDATE pending_cart_emails
              SET sent = TRUE, sent_at = NOW()
              WHERE id = $1
            `, [emailData.id])
            
            console.log(`✅ Cart reminder email sent to: ${emailData.user_email} for product: ${emailData.product_name}`)
          } else {
            // Cart is empty, mark as sent (no need to send)
            await pool.query(`
              UPDATE pending_cart_emails
              SET sent = TRUE, sent_at = NOW()
              WHERE id = $1
            `, [emailData.id])
            
            console.log(`⏭️  Skipping email to ${emailData.user_email} - cart is empty`)
          }
        } catch (emailError: any) {
          console.error(`❌ Error sending scheduled cart email (ID: ${emailData.id}):`, emailError)
          // Mark as sent to avoid retrying failed emails indefinitely
          // You might want to add a retry count instead
          await pool.query(`
            UPDATE pending_cart_emails
            SET sent = TRUE, sent_at = NOW()
            WHERE id = $1
          `, [emailData.id])
        }
      }
      
      console.log('✅ Cart email scheduler check completed')
    } catch (error) {
      console.error('❌ Error in cart email scheduler cron job:', error)
    }
  })
  
  console.log('✅ Cart email scheduler cron job started (runs every 5 minutes)')
}

