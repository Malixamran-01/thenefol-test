"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ensureSchema = ensureSchema;
async function ensureSchema(pool) {
    // Create tables first
    await pool.query(`
    create table if not exists products (
      id serial primary key,
      title text not null,
      slug text,
      category text default '',
      price text default '',
      list_image text default '',
      description text default '',
      details jsonb default '{}'::jsonb,
      brand text default '',
      key_ingredients text default '',
      skin_type text default '',
      hair_type text default '',
      created_at timestamptz default now(),
      updated_at timestamptz default now()
    );
    
    -- Product Variants core
    create table if not exists variant_options (
      id serial primary key,
      product_id integer not null references products(id) on delete cascade,
      name text not null, -- e.g., Size, Color
      values text[] not null default '{}',
      created_at timestamptz default now(),
      updated_at timestamptz default now()
    );

    create table if not exists product_variants (
      id serial primary key,
      product_id integer not null references products(id) on delete cascade,
      sku text unique,
      attributes jsonb not null default '{}'::jsonb, -- {Size: "M", Color: "Red"}
      price text,
      mrp text,
      image_url text,
      barcode text,
      is_active boolean default true,
      created_at timestamptz default now(),
      updated_at timestamptz default now()
    );

    create index if not exists idx_product_variants_product on product_variants(product_id);
    create index if not exists idx_variant_options_product on variant_options(product_id);
    create index if not exists idx_product_variants_active on product_variants(is_active);
    
    -- Inventory core
    create table if not exists inventory (
      id serial primary key,
      product_id integer references products(id) on delete cascade,
      variant_id integer references product_variants(id) on delete cascade,
      quantity integer not null default 0,
      reserved integer not null default 0,
      low_stock_threshold integer not null default 0,
      updated_at timestamptz default now(),
      unique(product_id, variant_id)
    );
    
    create table if not exists inventory_logs (
      id serial primary key,
      product_id integer references products(id) on delete set null,
      variant_id integer references product_variants(id) on delete set null,
      change integer not null,
      reason text not null,
      metadata jsonb,
      created_at timestamptz default now()
    );
    
    create index if not exists idx_inventory_product on inventory(product_id);
    create index if not exists idx_inventory_variant on inventory(variant_id);
    create index if not exists idx_inventory_logs_created_at on inventory_logs(created_at);
    
    create table if not exists users (
      id serial primary key,
      name text not null,
      email text unique not null,
      password text not null,
      phone text,
      address jsonb,
      profile_photo text,
      loyalty_points integer default 0,
      total_orders integer default 0,
      member_since timestamptz default now(),
      is_verified boolean default false,
      created_at timestamptz default now(),
      updated_at timestamptz default now()
    );
    
    -- OTP table for WhatsApp authentication
    create table if not exists otp_verifications (
      id serial primary key,
      phone text not null,
      otp text not null,
      expires_at timestamptz not null,
      verified boolean default false,
      attempts integer default 0,
      created_at timestamptz default now()
    );
    
    create index if not exists idx_otp_phone on otp_verifications(phone);
    create index if not exists idx_otp_expires on otp_verifications(expires_at);
    
    create table if not exists videos (
      id serial primary key,
      title text not null,
      description text not null,
      video_url text not null,
      redirect_url text not null,
      price text not null,
      size text not null check (size in ('small', 'medium', 'large')),
      thumbnail_url text not null,
      video_type text not null default 'url' check (video_type in ('local', 'instagram', 'facebook', 'youtube', 'url')),
      is_active boolean default true,
      views integer default 0,
      likes integer default 0,
      created_at timestamptz default now(),
      updated_at timestamptz default now()
    );
    
    -- Video views tracking table - one view per user/session
    create table if not exists video_views (
      id serial primary key,
      video_id integer not null references videos(id) on delete cascade,
      user_id integer,
      session_id text,
      viewed_at timestamptz default now(),
      check (user_id is not null or session_id is not null)
    );
    
    create index if not exists idx_video_views_video_id on video_views(video_id);
    create index if not exists idx_video_views_user_id on video_views(user_id);
    create index if not exists idx_video_views_session_id on video_views(session_id);
    
    -- Unique indexes to prevent duplicate views (handles NULLs properly)
    create unique index if not exists idx_video_views_user_unique 
      on video_views(video_id, user_id) where user_id is not null;
    create unique index if not exists idx_video_views_session_unique 
      on video_views(video_id, session_id) where session_id is not null;
    
    create table if not exists product_images (
      id serial primary key,
      product_id integer not null references products(id) on delete cascade,
      url text not null,
      type text default 'pdp' check (type in ('pdp', 'banner')),
      created_at timestamptz default now()
    );
    
    -- Ensure type column exists (for existing tables created before this column was added)
    do $$ 
    begin
      if not exists (
        select 1 from information_schema.columns 
        where table_name = 'product_images' and column_name = 'type'
      ) then
        alter table product_images add column type text default 'pdp';
        alter table product_images add constraint product_images_type_check 
          check (type in ('pdp', 'banner'));
        update product_images set type = 'pdp' where type is null;
      end if;
    end $$;
    
    create table if not exists cart (
      id serial primary key,
      user_id integer not null references users(id) on delete cascade,
      product_id integer not null references products(id) on delete cascade,
      quantity integer not null default 1,
      created_at timestamptz default now(),
      updated_at timestamptz default now(),
      unique(user_id, product_id)
    );
    
    create table if not exists wishlist (
      id serial primary key,
      user_id integer not null references users(id) on delete cascade,
      product_id integer not null references products(id) on delete cascade,
      created_at timestamptz default now(),
      unique(user_id, product_id)
    );
    
    create table if not exists orders (
      id serial primary key,
      order_number text unique not null,
      customer_name text not null,
      customer_email text not null,
      shipping_address jsonb not null,
      items jsonb not null,
      subtotal numeric(12,2) not null,
      shipping numeric(12,2) not null default 0,
      tax numeric(12,2) not null default 0,
      total numeric(12,2) not null,
      status text not null default 'created',
      payment_method text,
      payment_type text,
      created_at timestamptz default now(),
      updated_at timestamptz default now()
    );
    
    -- Add invoice_number column if it doesn't exist
    do $$ 
    begin
      if not exists (select 1 from information_schema.columns where table_name = 'orders' and column_name = 'invoice_number') then
        alter table orders add column invoice_number text;
      end if;
    end $$;
    
    -- Add billing_address column if it doesn't exist
    do $$ 
    begin
      if not exists (select 1 from information_schema.columns where table_name = 'orders' and column_name = 'billing_address') then
        alter table orders add column billing_address jsonb;
      end if;
    end $$;
    
    -- Invoice numbers table for tracking
    create table if not exists invoice_numbers (
      id serial primary key,
      invoice_number text unique not null,
      order_id integer references orders(id) on delete set null,
      financial_year text,
      created_at timestamptz default now()
    );
    
    create index if not exists idx_invoice_numbers_order on invoice_numbers(order_id);
    create index if not exists idx_invoice_numbers_fy on invoice_numbers(financial_year);
    
    -- Ensure updated_at trigger exists
    create or replace function set_updated_at()
    returns trigger as $$ begin new.updated_at = now(); return new; end; $$ language plpgsql;
    
    drop trigger if exists trg_products_updated_at on products;
    create trigger trg_products_updated_at before update on products
    for each row execute procedure set_updated_at();
    
    -- Real-time analytics tables
    create table if not exists page_views (
      id serial primary key,
      user_id integer,
      page varchar(500) not null,
      session_id varchar(255),
      user_agent text,
      referrer text,
      ip_address inet,
      timestamp timestamptz default now(),
      duration_seconds integer default 0
    );
    
    create index if not exists idx_page_views_user_id on page_views(user_id);
    create index if not exists idx_page_views_page on page_views(page);
    create index if not exists idx_page_views_timestamp on page_views(timestamp);
    create index if not exists idx_page_views_session_id on page_views(session_id);
    
    create table if not exists user_actions (
      id serial primary key,
      user_id integer,
      action varchar(100),
      action_data jsonb default '{}'::jsonb,
      page varchar(500),
      session_id varchar(255),
      timestamp timestamptz default now()
    );
    
    create index if not exists idx_user_actions_user_id on user_actions(user_id);
    create index if not exists idx_user_actions_timestamp on user_actions(timestamp);
    create index if not exists idx_user_actions_session_id on user_actions(session_id);
    
    create table if not exists live_sessions (
      id serial primary key,
      user_id integer,
      socket_id varchar(255) unique not null,
      session_id varchar(255) not null,
      last_activity timestamptz default now(),
      current_page varchar(500),
      is_active boolean default true,
      connected_at timestamptz default now(),
      user_agent text,
      ip_address inet
    );
    
    create index if not exists idx_live_sessions_user_id on live_sessions(user_id);
    create index if not exists idx_live_sessions_socket_id on live_sessions(socket_id);
    create index if not exists idx_live_sessions_session_id on live_sessions(session_id);
    create index if not exists idx_live_sessions_is_active on live_sessions(is_active);
    
    create table if not exists cart_events (
      id serial primary key,
      user_id integer,
      action varchar(50) not null,
      product_id integer,
      product_name text,
      quantity integer,
      price text,
      session_id varchar(255),
      timestamp timestamptz default now()
    );
    
    create index if not exists idx_cart_events_user_id on cart_events(user_id);
    create index if not exists idx_cart_events_timestamp on cart_events(timestamp);
    
    create table if not exists search_queries (
      id serial primary key,
      user_id integer,
      query text not null,
      results_count integer default 0,
      session_id varchar(255),
      timestamp timestamptz default now()
    );
    
    create index if not exists idx_search_queries_user_id on search_queries(user_id);
    create index if not exists idx_search_queries_timestamp on search_queries(timestamp);
    create index if not exists idx_search_queries_query on search_queries(query);
    
    -- Blog posts table for blog request system
    create table if not exists blog_posts (
      id serial primary key,
      title text not null,
      excerpt text not null,
      content text not null,
      author_name text not null,
      author_email text not null,
      images jsonb default '[]'::jsonb,
      status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
      featured boolean default false,
      rejection_reason text,
      created_at timestamptz default now(),
      updated_at timestamptz default now()
    );
    
    create index if not exists idx_blog_posts_status on blog_posts(status);
    create index if not exists idx_blog_posts_featured on blog_posts(featured);
    create index if not exists idx_blog_posts_created_at on blog_posts(created_at);
    
    -- CMS pages table
    create table if not exists cms_pages (
      id serial primary key,
      slug text unique not null,
      title text not null,
      content jsonb default '{}'::jsonb,
      meta_description text,
      is_active boolean default true,
      created_at timestamptz default now(),
      updated_at timestamptz default now()
    );
    
    create index if not exists idx_cms_pages_slug on cms_pages(slug);
    create index if not exists idx_cms_pages_is_active on cms_pages(is_active);
    
    -- CMS sections table
    create table if not exists cms_sections (
      id serial primary key,
      page_id integer not null references cms_pages(id) on delete cascade,
      section_type text not null,
      title text,
      content jsonb default '{}'::jsonb,
      order_index integer default 0,
      is_active boolean default true,
      created_at timestamptz default now(),
      updated_at timestamptz default now()
    );
    
    create index if not exists idx_cms_sections_page_id on cms_sections(page_id);
    create index if not exists idx_cms_sections_order on cms_sections(order_index);
    
    -- Affiliate Program Tables
    create table if not exists affiliate_applications (
      id serial primary key,
      name text not null,
      email text not null,
      phone text not null,
      instagram text,
      snapchat text,
      youtube text,
      facebook text,
      followers text,
      platform text,
      experience text,
      why_join text,
      expected_sales text,
      house_number text not null,
      street text not null,
      building text,
      apartment text,
      road text not null,
      city text not null,
      pincode text not null,
      state text not null,
      agree_terms boolean not null,
      status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
      verification_code text,
      admin_notes text,
      rejection_reason text,
      application_date timestamptz default now(),
      approved_at timestamptz,
      rejected_at timestamptz,
      created_at timestamptz default now(),
      updated_at timestamptz default now()
    );
    
    create table if not exists affiliate_partners (
      id serial primary key,
      application_id integer references affiliate_applications(id) on delete cascade,
      user_id integer references users(id) on delete set null,
      name text not null,
      email text not null,
      phone text not null,
      verification_code text unique not null,
      status text not null default 'unverified' check (status in ('unverified', 'active', 'suspended', 'terminated')),
      commission_rate numeric(5,2) default 15.0,
      total_earnings numeric(12,2) default 0,
      total_referrals integer default 0,
      pending_earnings numeric(12,2) default 0,
      last_payment timestamptz,
      verified_at timestamptz,
      created_at timestamptz default now(),
      updated_at timestamptz default now()
    );
    
    create table if not exists affiliate_referrals (
      id serial primary key,
      affiliate_id integer not null references affiliate_partners(id) on delete cascade,
      order_id integer references orders(id) on delete set null,
      customer_email text not null,
      customer_name text not null,
      order_total numeric(12,2) not null,
      commission_earned numeric(12,2) not null,
      commission_rate numeric(5,2) not null,
      status text not null default 'pending' check (status in ('pending', 'confirmed', 'paid')),
      referral_date timestamptz default now(),
      confirmed_at timestamptz,
      paid_at timestamptz,
      created_at timestamptz default now(),
      updated_at timestamptz default now()
    );
    
    create table if not exists affiliate_payouts (
      id serial primary key,
      affiliate_id integer not null references affiliate_partners(id) on delete cascade,
      amount numeric(12,2) not null,
      status text not null default 'pending' check (status in ('pending', 'processing', 'completed', 'failed')),
      payment_method text,
      payment_reference text,
      payout_period_start timestamptz not null,
      payout_period_end timestamptz not null,
      processed_at timestamptz,
      created_at timestamptz default now(),
      updated_at timestamptz default now()
    );
    
    create table if not exists affiliate_commission_settings (
      id serial primary key,
      commission_percentage numeric(5,2) not null default 15.0,
      is_active boolean not null default true,
      created_at timestamptz default now(),
      updated_at timestamptz default now()
    );
    
    -- Add affiliate_id to orders table
    alter table orders add column if not exists affiliate_id integer references affiliate_partners(id) on delete set null;
    
    -- Create indexes for affiliate tables
    create index if not exists idx_affiliate_applications_email on affiliate_applications(email);
    create index if not exists idx_affiliate_applications_status on affiliate_applications(status);
    create index if not exists idx_affiliate_applications_date on affiliate_applications(application_date);
    
    create index if not exists idx_affiliate_partners_user_id on affiliate_partners(user_id);
    create index if not exists idx_affiliate_partners_status on affiliate_partners(status);
    create index if not exists idx_affiliate_partners_code on affiliate_partners(verification_code);
    
    create index if not exists idx_affiliate_referrals_affiliate_id on affiliate_referrals(affiliate_id);
    create index if not exists idx_affiliate_referrals_status on affiliate_referrals(status);
    create index if not exists idx_affiliate_referrals_date on affiliate_referrals(referral_date);
    
    create index if not exists idx_affiliate_payouts_affiliate_id on affiliate_payouts(affiliate_id);
    create index if not exists idx_affiliate_payouts_status on affiliate_payouts(status);
    
    create index if not exists idx_orders_affiliate_id on orders(affiliate_id);
    
    -- Marketing Tables
    -- Cashback System
    create table if not exists cashback_transactions (
      id serial primary key,
      user_id integer references users(id) on delete set null,
      amount numeric(12,2) not null,
      transaction_type text not null check (transaction_type in ('earned', 'redeemed')),
      status text not null default 'pending' check (status in ('pending', 'completed', 'cancelled')),
      description text,
      created_at timestamptz default now()
    );
    
    create table if not exists cashback_offers (
      id serial primary key,
      offer_name text not null,
      description text,
      min_purchase numeric(12,2),
      cashback_percentage numeric(5,2),
      cashback_amount numeric(12,2),
      valid_from timestamptz,
      valid_until timestamptz,
      is_active boolean default true,
      created_at timestamptz default now()
    );
    
    -- Email Marketing
    create table if not exists email_campaigns (
      id serial primary key,
      name text not null,
      subject text not null,
      content text,
      audience text,
      type text default 'promotional',
      status text not null default 'draft',
      sent_count integer default 0,
      opened_count integer default 0,
      clicked_count integer default 0,
      conversion_count integer default 0,
      scheduled_date timestamptz,
      sent_date timestamptz,
      created_at timestamptz default now(),
      updated_at timestamptz default now()
    );
    
    create table if not exists email_templates (
      id serial primary key,
      name text not null,
      subject text not null,
      content text,
      category text default 'general',
      is_active boolean default true,
      created_at timestamptz default now()
    );
    
    create table if not exists email_automations (
      id serial primary key,
      name text not null,
      trigger text not null,
      condition text,
      action text not null,
      is_active boolean default false,
      messages_sent integer default 0,
      response_rate numeric(5,2) default 0,
      created_at timestamptz default now(),
      updated_at timestamptz default now()
    );
    
    create table if not exists email_lists (
      id serial primary key,
      name text not null,
      description text,
      subscriber_count integer default 0,
      is_active boolean default true,
      created_at timestamptz default now(),
      updated_at timestamptz default now()
    );
    
    create table if not exists email_subscribers (
      id serial primary key,
      email text not null,
      name text,
      list_id integer references email_lists(id) on delete cascade,
      status text default 'subscribed' check (status in ('subscribed', 'unsubscribed', 'bounced', 'complained')),
      subscribed_at timestamptz default now(),
      unsubscribed_at timestamptz,
      metadata jsonb default '{}'::jsonb,
      created_at timestamptz default now(),
      updated_at timestamptz default now(),
      unique(email, list_id)
    );
    
    create table if not exists email_sending_logs (
      id serial primary key,
      campaign_id integer references email_campaigns(id) on delete set null,
      recipient_email text not null,
      recipient_name text,
      subject text not null,
      status text not null default 'pending' check (status in ('pending', 'sent', 'delivered', 'failed', 'bounced', 'opened', 'clicked')),
      message_id text,
      error_message text,
      opened_at timestamptz,
      clicked_at timestamptz,
      sent_at timestamptz,
      created_at timestamptz default now()
    );
    
    -- SMS Marketing
    create table if not exists sms_campaigns (
      id serial primary key,
      name text not null,
      message text not null,
      audience text,
      status text not null default 'draft',
      sent_count integer default 0,
      delivered_count integer default 0,
      clicked_count integer default 0,
      conversion_count integer default 0,
      scheduled_date timestamptz,
      sent_date timestamptz,
      created_at timestamptz default now(),
      updated_at timestamptz default now()
    );
    
    create table if not exists sms_templates (
      id serial primary key,
      name text not null,
      message text not null,
      is_active boolean default true,
      created_at timestamptz default now()
    );
    
    create table if not exists sms_automations (
      id serial primary key,
      name text not null,
      trigger text not null,
      condition text,
      action text not null,
      is_active boolean default false,
      messages_sent integer default 0,
      response_rate numeric(5,2) default 0,
      created_at timestamptz default now(),
      updated_at timestamptz default now()
    );
    
    -- Push Notifications
    create table if not exists push_notifications (
      id serial primary key,
      title text not null,
      message text not null,
      status text not null default 'draft',
      type text not null default 'promotional',
      audience text,
      scheduled_date timestamptz,
      sent_date timestamptz,
      recipients integer default 0,
      delivery_rate numeric(5,2) default 0,
      open_rate numeric(5,2) default 0,
      click_rate numeric(5,2) default 0,
      conversion_rate numeric(5,2) default 0,
      revenue numeric(12,2) default 0,
      image_url text,
      action_url text,
      created_at timestamptz default now(),
      updated_at timestamptz default now()
    );
    
    create table if not exists push_templates (
      id serial primary key,
      name text not null,
      category text not null,
      title text not null,
      message text not null,
      is_custom boolean default false,
      created_at timestamptz default now()
    );
    
    create table if not exists push_automations (
      id serial primary key,
      name text not null,
      trigger text not null,
      condition text,
      action text not null,
      is_active boolean default false,
      notifications_sent integer default 0,
      conversion_rate numeric(5,2) default 0,
      created_at timestamptz default now(),
      updated_at timestamptz default now()
    );
    
    -- WhatsApp Chat
    create table if not exists whatsapp_chat_sessions (
      id serial primary key,
      customer_name text not null,
      customer_phone text not null,
      customer_email text,
      status text not null default 'active',
      priority text not null default 'medium',
      assigned_agent text,
      last_message text,
      last_message_time timestamptz,
      message_count integer default 0,
      tags text[],
      notes text,
      created_at timestamptz default now(),
      updated_at timestamptz default now()
    );
    
    create table if not exists whatsapp_templates (
      id serial primary key,
      name text not null,
      category text not null,
      content text not null,
      variables text[],
      is_approved boolean default false,
      scheduled_date timestamptz,
      scheduled_time text,
      is_scheduled boolean default false,
      created_at timestamptz default now(),
      updated_at timestamptz default now()
    );
    
    create table if not exists whatsapp_automations (
      id serial primary key,
      name text not null,
      trigger text not null,
      condition text,
      action text not null,
      template_id integer references whatsapp_templates(id) on delete set null,
      scheduled_date timestamptz,
      scheduled_time text,
      is_scheduled boolean default false,
      is_active boolean default false,
      messages_sent integer default 0,
      response_rate numeric(5,2) default 0,
      created_at timestamptz default now(),
      updated_at timestamptz default now()
    );
    
    create table if not exists whatsapp_scheduled_messages (
      id serial primary key,
      template_id integer references whatsapp_templates(id) on delete set null,
      automation_id integer references whatsapp_automations(id) on delete set null,
      phone text not null,
      message text not null,
      scheduled_at timestamptz not null,
      status text default 'pending' check (status in ('pending', 'sent', 'failed', 'cancelled')),
      sent_at timestamptz,
      error_message text,
      created_at timestamptz default now(),
      updated_at timestamptz default now()
    );
    
    create index if not exists idx_whatsapp_scheduled_messages_status on whatsapp_scheduled_messages(status);
    create index if not exists idx_whatsapp_scheduled_messages_scheduled_at on whatsapp_scheduled_messages(scheduled_at);
    
    create table if not exists whatsapp_config (
      id serial primary key,
      access_token text,
      phone_number_id text,
      business_account_id text,
      webhook_url text,
      verify_token text,
      created_at timestamptz default now(),
      updated_at timestamptz default now()
    );
    
    -- Live Chat
    create table if not exists live_chat_sessions (
      id serial primary key,
      customer_name text not null,
      customer_email text not null,
      customer_phone text,
      status text not null default 'active',
      priority text not null default 'medium',
      assigned_agent text,
      last_message text,
      last_message_time timestamptz,
      message_count integer default 0,
      tags text[],
      notes text,
      created_at timestamptz default now(),
      updated_at timestamptz default now()
    );
    
    create table if not exists live_chat_agents (
      id serial primary key,
      name text not null,
      email text not null,
      phone text,
      status text not null default 'online',
      active_sessions integer default 0,
      total_sessions integer default 0,
      avg_response_time numeric(10,2),
      avg_satisfaction numeric(5,2),
      created_at timestamptz default now(),
      updated_at timestamptz default now()
    );
    
    create table if not exists live_chat_widgets (
      id serial primary key,
      name text not null,
      position text default 'bottom-right',
      color text default 'blue',
      is_active boolean default true,
      created_at timestamptz default now()
    );
    
    -- Additional tables referenced in CRUD handlers
    create table if not exists whatsapp_chat (
      id serial primary key,
      phone_number text not null,
      session_id text,
      status text not null default 'active',
      last_message text,
      last_message_time timestamptz,
      created_at timestamptz default now(),
      updated_at timestamptz default now()
    );
    
    create table if not exists live_chat (
      id serial primary key,
      customer_name text not null,
      customer_email text,
      customer_phone text,
      session_id text unique,
      status text not null default 'active',
      priority text not null default 'medium',
      last_message text,
      created_at timestamptz default now(),
      updated_at timestamptz default now()
    );
    
    create table if not exists analytics_data (
      id serial primary key,
      metric_name text not null,
      metric_value numeric(12,2),
      metric_type text,
      date date,
      metadata jsonb default '{}'::jsonb,
      created_at timestamptz default now()
    );
    
    create table if not exists forms (
      id serial primary key,
      name text not null,
      fields jsonb default '[]'::jsonb,
      status text not null default 'active',
      created_at timestamptz default now(),
      updated_at timestamptz default now()
    );
    
    create table if not exists form_submissions (
      id serial primary key,
      form_id integer references forms(id) on delete set null,
      data jsonb not null default '{}'::jsonb,
      status text not null default 'new',
      created_at timestamptz default now(),
      updated_at timestamptz default now()
    );
    
    create table if not exists contact_messages (
      id serial primary key,
      name text not null,
      email text not null,
      phone text,
      message text not null,
      status text not null default 'unread',
      created_at timestamptz default now(),
      updated_at timestamptz default now()
    );
    
    create table if not exists workflows (
      id serial primary key,
      name text not null,
      description text,
      steps jsonb default '[]'::jsonb,
      is_active boolean default true,
      created_at timestamptz default now(),
      updated_at timestamptz default now()
    );
    
    create table if not exists customer_segments (
      id serial primary key,
      name text not null,
      description text,
      criteria jsonb default '{}'::jsonb,
      customer_count integer default 0,
      created_at timestamptz default now(),
      updated_at timestamptz default now()
    );
    
    create table if not exists customer_journeys (
      id serial primary key,
      customer_id integer references users(id) on delete set null,
      journey_step text not null,
      step_data jsonb default '{}'::jsonb,
      timestamp timestamptz default now()
    );
    
    create table if not exists actionable_insights (
      id serial primary key,
      insight_type text not null,
      title text,
      description text,
      impact text,
      category text,
      action text,
      estimated_value numeric(12,2),
      priority integer default 0,
      status text not null default 'new',
      created_at timestamptz default now(),
      updated_at timestamptz default now()
    );
    
    create table if not exists ai_features (
      id serial primary key,
      feature_name text not null,
      description text,
      is_active boolean default true,
      configuration jsonb default '{}'::jsonb,
      created_at timestamptz default now(),
      updated_at timestamptz default now()
    );
    
    create table if not exists journey_funnels (
      id serial primary key,
      funnel_name text not null,
      description text,
      steps jsonb default '[]'::jsonb,
      conversion_rate numeric(5,2) default 0,
      created_at timestamptz default now(),
      updated_at timestamptz default now()
    );
    
    create table if not exists personalization_rules (
      id serial primary key,
      rule_name text not null,
      description text,
      conditions jsonb default '{}'::jsonb,
      actions jsonb default '{}'::jsonb,
      is_active boolean default true,
      created_at timestamptz default now(),
      updated_at timestamptz default now()
    );
    
    create table if not exists custom_audiences (
      id serial primary key,
      audience_name text not null,
      description text,
      criteria jsonb default '{}'::jsonb,
      size integer default 0,
      created_at timestamptz default now(),
      updated_at timestamptz default now()
    );
    
    create table if not exists omni_channel_campaigns (
      id serial primary key,
      campaign_name text not null,
      description text,
      channels text[],
      status text not null default 'draft',
      created_at timestamptz default now(),
      updated_at timestamptz default now()
    );
    
    create table if not exists api_configurations (
      id serial primary key,
      name text not null,
      category text not null,
      api_key text,
      api_secret text,
      base_url text,
      configuration jsonb default '{}'::jsonb,
      created_at timestamptz default now(),
      updated_at timestamptz default now()
    );
    
    create table if not exists invoices (
      id serial primary key,
      invoice_number text not null unique,
      customer_name text not null,
      customer_email text not null,
      order_id integer references orders(id) on delete set null,
      amount numeric(12,2) not null,
      due_date date not null,
      status text not null default 'unpaid',
      created_at timestamptz default now(),
      updated_at timestamptz default now()
    );
    
    create table if not exists tax_rates (
      id serial primary key,
      name text not null,
      rate numeric(5,2) not null,
      type text not null,
      region text not null,
      is_active boolean default true,
      created_at timestamptz default now(),
      updated_at timestamptz default now()
    );
    
    create table if not exists tax_rules (
      id serial primary key,
      name text not null,
      conditions jsonb not null,
      tax_rate_ids integer[],
      is_active boolean default true,
      created_at timestamptz default now(),
      updated_at timestamptz default now()
    );
    
    create table if not exists returns (
      id serial primary key,
      return_number text not null unique,
      order_id integer references orders(id) on delete set null,
      customer_name text not null,
      customer_email text not null,
      reason text not null,
      total_amount numeric(12,2) not null,
      refund_amount numeric(12,2) not null,
      status text not null default 'pending',
      created_at timestamptz default now(),
      updated_at timestamptz default now()
    );
    
    create table if not exists payment_methods (
      id serial primary key,
      name text not null,
      type text not null,
      is_active boolean default true,
      configuration jsonb default '{}'::jsonb,
      created_at timestamptz default now(),
      updated_at timestamptz default now()
    );
    
    create table if not exists payment_gateways (
      id serial primary key,
      name text not null,
      type text not null,
      api_key text,
      secret_key text,
      webhook_url text,
      is_active boolean default true,
      created_at timestamptz default now(),
      updated_at timestamptz default now()
    );
    
    create table if not exists payment_transactions (
      id serial primary key,
      transaction_id text not null unique,
      order_id integer references orders(id) on delete set null,
      customer_name text not null,
      amount numeric(12,2) not null,
      method text not null,
      gateway text not null,
      status text not null default 'pending',
      created_at timestamptz default now(),
      updated_at timestamptz default now()
    );
    
    create table if not exists loyalty_program (
      id serial primary key,
      name text not null,
      description text,
      points_per_purchase numeric(5,2) default 1.0,
      is_active boolean default true,
      created_at timestamptz default now(),
      updated_at timestamptz default now()
    );
    -- Align loyalty_program with admin UI expectations
    alter table loyalty_program add column if not exists points_per_rupee numeric(10,2) default 1;
    alter table loyalty_program add column if not exists referral_bonus integer default 0;
    alter table loyalty_program add column if not exists vip_threshold integer default 0;
    alter table loyalty_program add column if not exists status text default 'active' check (status in ('active','inactive'));
    create index if not exists idx_loyalty_program_status on loyalty_program(status);
    create index if not exists idx_loyalty_program_created_at on loyalty_program(created_at);
    
    create table if not exists affiliate_program (
      id serial primary key,
      name text not null,
      description text,
      commission_rate numeric(5,2) default 10.0,
      is_active boolean default true,
      created_at timestamptz default now(),
      updated_at timestamptz default now()
    );
    
    create table if not exists cashback_system (
      id serial primary key,
      name text not null,
      description text,
      cashback_percentage numeric(5,2),
      is_active boolean default true,
      created_at timestamptz default now(),
      updated_at timestamptz default now()
    );
    
    create table if not exists order_delivery_status (
      id serial primary key,
      order_id integer references orders(id) on delete cascade,
      status text not null,
      estimated_delivery date,
      actual_delivery date,
      carrier text,
      tracking_number text,
      created_at timestamptz default now(),
      updated_at timestamptz default now()
    );
    
    create table if not exists product_reviews (
      id serial primary key,
      order_id integer references orders(id) on delete set null,
      product_id integer references products(id) on delete cascade,
      customer_email text not null,
      customer_name text not null,
      rating integer not null check (rating between 1 and 5),
      title text,
      review_text text,
      comment text,
      images jsonb,
      is_approved boolean default true,
      is_verified boolean default false,
      is_featured boolean default false,
      points_awarded integer default 0,
      status text default 'pending',
      created_at timestamptz default now(),
      updated_at timestamptz default now()
    );
    
    create table if not exists product_questions (
      id serial primary key,
      product_id integer references products(id) on delete cascade,
      customer_name text not null,
      customer_email text not null,
      customer_phone text,
      question text not null,
      answer text,
      answered_by integer references users(id) on delete set null,
      answered_at timestamptz,
      status text default 'pending',
      created_at timestamptz default now(),
      updated_at timestamptz default now()
    );
    
    create table if not exists delivery_notifications (
      id serial primary key,
      order_id integer references orders(id) on delete cascade,
      customer_email text not null,
      notification_type text not null,
      message text,
      sent_at timestamptz,
      created_at timestamptz default now()
    );
    
    create table if not exists shiprocket_config (
      id serial primary key,
      api_key text not null,
      api_secret text not null,
      is_active boolean default true,
      created_at timestamptz default now(),
      updated_at timestamptz default now()
    );
    
    create table if not exists shiprocket_shipments (
      id serial primary key,
      order_id integer references orders(id) on delete cascade,
      shipment_id text,
      tracking_url text,
      status text not null default 'pending',
      awb_code text,
      label_url text,
      created_at timestamptz default now(),
      updated_at timestamptz default now()
    );
    
    create table if not exists discounts (
      id serial primary key,
      name text not null,
      code text not null unique,
      type text not null check (type in ('percentage', 'fixed')),
      value numeric(10,2) not null,
      min_purchase numeric(12,2),
      max_discount numeric(12,2),
      valid_from date,
      valid_until date,
      usage_limit integer,
      usage_count integer default 0,
      is_active boolean default true,
      created_at timestamptz default now(),
      updated_at timestamptz default now()
    );
    
    create table if not exists discount_usage (
      id serial primary key,
      discount_id integer references discounts(id) on delete cascade,
      order_id integer references orders(id) on delete cascade,
      customer_email text not null,
      discount_amount numeric(12,2) not null,
      created_at timestamptz default now()
    );
    
    -- Promotion enrollments for users who subscribe to WhatsApp
    create table if not exists promotion_enrollments (
      id serial primary key,
      user_id integer references users(id) on delete cascade,
      phone text,
      discount_id integer references discounts(id) on delete cascade,
      cashback_offer_id integer references cashback_offers(id) on delete cascade,
      enrollment_source text default 'whatsapp_subscription',
      enrolled_at timestamptz default now(),
      is_active boolean default true,
      CHECK ((user_id IS NOT NULL) OR (phone IS NOT NULL)),
      CHECK ((discount_id IS NOT NULL) OR (cashback_offer_id IS NOT NULL))
    );
    
    create index if not exists idx_promotion_enrollments_user on promotion_enrollments(user_id);
    create index if not exists idx_promotion_enrollments_phone on promotion_enrollments(phone);
    create index if not exists idx_promotion_enrollments_discount on promotion_enrollments(discount_id);
    create index if not exists idx_promotion_enrollments_cashback on promotion_enrollments(cashback_offer_id);
    
    create index if not exists idx_whatsapp_chat_phone on whatsapp_chat(phone_number);
    create index if not exists idx_live_chat_email on live_chat(customer_email);
    create index if not exists idx_analytics_metric on analytics_data(metric_name);
    create index if not exists idx_contact_messages_status on contact_messages(status);
    create index if not exists idx_contact_messages_email on contact_messages(email);
    create index if not exists idx_contact_messages_created_at on contact_messages(created_at);
    create index if not exists idx_customer_journeys_customer on customer_journeys(customer_id);
    create index if not exists idx_actionable_insights_type on actionable_insights(insight_type);
    create index if not exists idx_invoices_order on invoices(order_id);
    create index if not exists idx_payment_transactions_order on payment_transactions(order_id);
    create index if not exists idx_order_delivery_status_order on order_delivery_status(order_id);
    create index if not exists idx_product_reviews_product on product_reviews(product_id);
    create index if not exists idx_product_reviews_approved on product_reviews(is_approved) where is_approved = true;
    create index if not exists idx_product_questions_product on product_questions(product_id);
    create index if not exists idx_product_questions_status on product_questions(status);
    create index if not exists idx_delivery_notifications_order on delivery_notifications(order_id);
    create index if not exists idx_shiprocket_shipments_order on shiprocket_shipments(order_id);
    create index if not exists idx_discount_usage_discount on discount_usage(discount_id);
    create index if not exists idx_discount_usage_order on discount_usage(order_id);
    
    -- Migration: Add new columns to product_reviews if they don't exist
    DO $$
    BEGIN
      IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'product_reviews' AND column_name = 'title') THEN
        ALTER TABLE product_reviews ADD COLUMN title text;
      END IF;
      IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'product_reviews' AND column_name = 'review_text') THEN
        ALTER TABLE product_reviews ADD COLUMN review_text text;
      END IF;
      IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'product_reviews' AND column_name = 'images') THEN
        ALTER TABLE product_reviews ADD COLUMN images jsonb;
      END IF;
      IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'product_reviews' AND column_name = 'is_verified') THEN
        ALTER TABLE product_reviews ADD COLUMN is_verified boolean default false;
      END IF;
      IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'product_reviews' AND column_name = 'is_featured') THEN
        ALTER TABLE product_reviews ADD COLUMN is_featured boolean default false;
      END IF;
      IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'product_reviews' AND column_name = 'points_awarded') THEN
        ALTER TABLE product_reviews ADD COLUMN points_awarded integer default 0;
      END IF;
      IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'product_reviews' AND column_name = 'status') THEN
        ALTER TABLE product_reviews ADD COLUMN status text default 'approved';
      END IF;
      -- Migrate existing comment to review_text if review_text is empty
      UPDATE product_reviews SET review_text = comment WHERE (review_text IS NULL OR review_text = '') AND comment IS NOT NULL AND comment != '';
    END $$;
    
    -- Ensure shiprocket_shipments columns exist (migration for existing tables)
    DO $$
    BEGIN
      -- Add awb_code column if it doesn't exist (for tables created before this column was added)
      IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'shiprocket_shipments' AND column_name = 'awb_code') THEN
        ALTER TABLE shiprocket_shipments ADD COLUMN awb_code text;
      END IF;
      
      -- Add label_url column if it doesn't exist
      IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'shiprocket_shipments' AND column_name = 'label_url') THEN
        ALTER TABLE shiprocket_shipments ADD COLUMN label_url text;
      END IF;
      
      -- Add tracking_url column if it doesn't exist
      IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'shiprocket_shipments' AND column_name = 'tracking_url') THEN
        ALTER TABLE shiprocket_shipments ADD COLUMN tracking_url text;
      END IF;
      
      -- Add shipment_id column if it doesn't exist
      IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'shiprocket_shipments' AND column_name = 'shipment_id') THEN
        ALTER TABLE shiprocket_shipments ADD COLUMN shipment_id text;
      END IF;
    END $$;
    
    -- Ensure all discount columns exist (migration for existing tables)
    DO $$
    BEGIN
      -- Add missing columns to discounts table
      IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'discounts' AND column_name = 'min_purchase') THEN
        ALTER TABLE discounts ADD COLUMN min_purchase numeric(12,2);
      END IF;
      
      IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'discounts' AND column_name = 'max_discount') THEN
        ALTER TABLE discounts ADD COLUMN max_discount numeric(12,2);
      END IF;
      
      IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'discounts' AND column_name = 'valid_from') THEN
        ALTER TABLE discounts ADD COLUMN valid_from date;
      END IF;
      
      IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'discounts' AND column_name = 'valid_until') THEN
        ALTER TABLE discounts ADD COLUMN valid_until date;
      END IF;
      
      IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'discounts' AND column_name = 'usage_limit') THEN
        ALTER TABLE discounts ADD COLUMN usage_limit integer;
      END IF;
      
      IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'discounts' AND column_name = 'usage_count') THEN
        ALTER TABLE discounts ADD COLUMN usage_count integer default 0;
      END IF;
      
      IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'discounts' AND column_name = 'is_active') THEN
        ALTER TABLE discounts ADD COLUMN is_active boolean default true;
      END IF;
      
      IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'discounts' AND column_name = 'created_at') THEN
        ALTER TABLE discounts ADD COLUMN created_at timestamptz default now();
      END IF;
      
      IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'discounts' AND column_name = 'updated_at') THEN
        ALTER TABLE discounts ADD COLUMN updated_at timestamptz default now();
      END IF;
    END $$;
    
    -- Phase 2: Marketplaces & Staff Permissions
    create table if not exists marketplace_accounts (
      id serial primary key,
      channel text not null check (channel in ('amazon','flipkart','facebook','instagram','meesho','google')),
      name text not null,
      credentials jsonb not null default '{}'::jsonb,
      is_active boolean default true,
      created_at timestamptz default now(),
      updated_at timestamptz default now()
    );

    create unique index if not exists uq_marketplace_accounts_channel_name on marketplace_accounts(channel, name);

    create table if not exists channel_listings (
      id serial primary key,
      channel text not null,
      account_id integer references marketplace_accounts(id) on delete cascade,
      product_id integer references products(id) on delete cascade,
      variant_id integer references product_variants(id) on delete set null,
      external_listing_id text,
      sku text,
      price text,
      status text default 'pending',
      last_synced_at timestamptz,
      created_at timestamptz default now(),
      updated_at timestamptz default now()
    );
    
    create unique index if not exists uq_channel_listings_channel_account_product_variant 
    on channel_listings(channel, account_id, product_id, coalesce(variant_id, -1));

    create index if not exists idx_channel_listings_product on channel_listings(product_id);
    create index if not exists idx_channel_listings_variant on channel_listings(variant_id);
    create index if not exists idx_channel_listings_channel on channel_listings(channel);

    create table if not exists channel_orders (
      id serial primary key,
      channel text not null,
      account_id integer references marketplace_accounts(id) on delete set null,
      external_order_id text not null,
      order_id integer references orders(id) on delete set null,
      payload jsonb,
      status text,
      imported_at timestamptz default now(),
      updated_at timestamptz default now(),
      unique(channel, external_order_id)
    );

    create index if not exists idx_channel_orders_channel on channel_orders(channel);
    create index if not exists idx_channel_orders_order on channel_orders(order_id);

    -- Staff and Permissions
    create table if not exists staff_users (
      id serial primary key,
      name text not null,
      email text unique not null,
      password text not null,
      is_active boolean default true,
      last_login_at timestamptz,
      last_logout_at timestamptz,
      password_changed_at timestamptz,
      failed_login_attempts integer default 0,
      last_failed_login_at timestamptz,
      created_at timestamptz default now(),
      updated_at timestamptz default now()
    );

    create table if not exists staff_sessions (
      id serial primary key,
      staff_id integer not null references staff_users(id) on delete cascade,
      token text not null unique,
      user_agent text,
      ip_address text,
      metadata jsonb,
      created_at timestamptz default now(),
      expires_at timestamptz not null,
      revoked_at timestamptz
    );

    create index if not exists idx_staff_sessions_token on staff_sessions(token);

    create table if not exists roles (
      id serial primary key,
      name text unique not null,
      description text,
      created_at timestamptz default now(),
      updated_at timestamptz default now()
    );

    create table if not exists permissions (
      id serial primary key,
      code text unique not null,
      description text
    );

    create table if not exists role_permissions (
      role_id integer references roles(id) on delete cascade,
      permission_id integer references permissions(id) on delete cascade,
      primary key (role_id, permission_id)
    );

    create table if not exists staff_roles (
      staff_id integer references staff_users(id) on delete cascade,
      role_id integer references roles(id) on delete cascade,
      primary key (staff_id, role_id)
    );

    create table if not exists staff_activity_logs (
      id serial primary key,
      staff_id integer references staff_users(id) on delete set null,
      action text not null,
      resource text,
      metadata jsonb,
      created_at timestamptz default now()
    );

    -- Coin Withdrawal System
    create table if not exists coin_withdrawals (
      id serial primary key,
      user_id integer not null references users(id) on delete cascade,
      amount numeric(12,2) not null,
      withdrawal_method text not null check (withdrawal_method in ('bank', 'upi')),
      account_holder_name text not null,
      account_number text,
      ifsc_code text,
      bank_name text,
      upi_id text,
      status text not null default 'pending' check (status in ('pending', 'processing', 'completed', 'rejected', 'failed')),
      transaction_id text,
      razorpay_payout_id text,
      admin_notes text,
      rejection_reason text,
      processed_by integer references users(id) on delete set null,
      created_at timestamptz default now(),
      updated_at timestamptz default now(),
      processed_at timestamptz
    );
    
    create index if not exists idx_coin_withdrawals_user_id on coin_withdrawals(user_id);
    create index if not exists idx_coin_withdrawals_status on coin_withdrawals(status);
    create index if not exists idx_coin_withdrawals_created_at on coin_withdrawals(created_at);
    
    -- Coin Transaction History
    create table if not exists coin_transactions (
      id serial primary key,
      user_id integer not null references users(id) on delete cascade,
      amount integer not null,
      type text not null check (type in ('earned', 'redeemed', 'purchase_bonus', 'withdrawal_pending', 'withdrawal_processing', 'withdrawal_completed', 'withdrawal_rejected', 'withdrawal_failed', 'referral_bonus', 'order_bonus', 'cashback')),
      description text not null,
      order_id integer references orders(id) on delete set null,
      withdrawal_id integer references coin_withdrawals(id) on delete set null,
      status text not null default 'completed' check (status in ('pending', 'processing', 'completed', 'rejected', 'failed', 'cancelled')),
      metadata jsonb,
      created_at timestamptz default now(),
      updated_at timestamptz default now()
    );
    
    create index if not exists idx_coin_transactions_user_id on coin_transactions(user_id);
    create index if not exists idx_coin_transactions_type on coin_transactions(type);
    create index if not exists idx_coin_transactions_status on coin_transactions(status);
    create index if not exists idx_coin_transactions_created_at on coin_transactions(created_at);
    create index if not exists idx_coin_transactions_order_id on coin_transactions(order_id);
    create index if not exists idx_coin_transactions_withdrawal_id on coin_transactions(withdrawal_id);
    
    -- Admin Notifications Table
    create table if not exists admin_notifications (
      id serial primary key,
      user_id integer references users(id) on delete set null,
      notification_type text not null,
      title text not null,
      message text not null,
      link text,
      icon text,
      priority text default 'medium' check (priority in ('low', 'medium', 'high', 'urgent')),
      status text default 'unread' check (status in ('unread', 'read', 'archived')),
      metadata jsonb default '{}'::jsonb,
      read_at timestamptz,
      created_at timestamptz default now()
    );
    
    create index if not exists idx_admin_notifications_status on admin_notifications(status);
    create index if not exists idx_admin_notifications_type on admin_notifications(notification_type);
    create index if not exists idx_admin_notifications_created_at on admin_notifications(created_at);
    
    -- User Notifications Table
    create table if not exists user_notifications (
      id serial primary key,
      user_id integer references users(id) on delete cascade,
      notification_type text not null,
      title text not null,
      message text not null,
      link text,
      icon text,
      priority text default 'medium' check (priority in ('low', 'medium', 'high', 'urgent')),
      status text default 'unread' check (status in ('unread', 'read', 'archived')),
      metadata jsonb default '{}'::jsonb,
      read_at timestamptz,
      created_at timestamptz default now()
    );
    
    create index if not exists idx_user_notifications_user_id on user_notifications(user_id);
    create index if not exists idx_user_notifications_status on user_notifications(status);
    create index if not exists idx_user_notifications_type on user_notifications(notification_type);
    create index if not exists idx_user_notifications_created_at on user_notifications(created_at);
  `);
    // Ensure 'slug' column exists on products for older databases
    await pool.query(`
    ALTER TABLE products ADD COLUMN IF NOT EXISTS slug text;
  `);
    // Add unique constraint on products slug (safely)
    await pool.query(`
    DO $$ 
    BEGIN
      -- First, update any null slugs to be unique
      UPDATE products 
      SET slug = 'product-' || id::text 
      WHERE slug IS NULL OR slug = '';
      
      -- Then add the constraint if it doesn't exist
      IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'products_slug_key' 
        AND table_name = 'products'
      ) THEN
        ALTER TABLE products ADD CONSTRAINT products_slug_key UNIQUE (slug);
      END IF;
    END $$;
  `);
    // Add missing price column to cart_events table
    await pool.query(`
    ALTER TABLE cart_events 
    ADD COLUMN IF NOT EXISTS price text;
  `);
    // Migrate action_type to action in user_actions if needed
    await pool.query(`
    DO $$ 
    BEGIN
      -- Check if action_type column exists and action doesn't
      IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'user_actions' AND column_name = 'action_type'
      ) AND NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'user_actions' AND column_name = 'action'
      ) THEN
        ALTER TABLE user_actions RENAME COLUMN action_type TO action;
      END IF;
      
      -- Add action column if it doesn't exist
      IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'user_actions' AND column_name = 'action'
      ) THEN
        ALTER TABLE user_actions ADD COLUMN action varchar(100);
      END IF;
    END $$;
  `);
    // Create index on action column after migration
    await pool.query(`
    CREATE INDEX IF NOT EXISTS idx_user_actions_action ON user_actions(action);
  `);
    // Phase 3 & 4: Advanced Inventory + POS
    await pool.query(`
    create table if not exists warehouses (
      id serial primary key,
      name text not null unique,
      address jsonb,
      is_active boolean default true,
      created_at timestamptz default now(),
      updated_at timestamptz default now()
    );
    
    create table if not exists warehouse_inventory (
      id serial primary key,
      warehouse_id integer not null references warehouses(id) on delete cascade,
      product_id integer references products(id) on delete cascade,
      variant_id integer references product_variants(id) on delete set null,
      quantity integer not null default 0,
      reserved integer not null default 0
    );
    
    create unique index if not exists uq_warehouse_inventory_warehouse_product_variant 
    on warehouse_inventory(warehouse_id, product_id, coalesce(variant_id, -1));
    
    create index if not exists idx_warehouse_inventory_warehouse on warehouse_inventory(warehouse_id);
    create index if not exists idx_warehouse_inventory_product on warehouse_inventory(product_id);
    
    create table if not exists stock_transfers (
      id serial primary key,
      from_warehouse_id integer not null references warehouses(id) on delete restrict,
      to_warehouse_id integer not null references warehouses(id) on delete restrict,
      product_id integer references products(id) on delete restrict,
      variant_id integer references product_variants(id) on delete set null,
      quantity integer not null,
      status text default 'pending' check (status in ('pending', 'in_transit', 'completed', 'cancelled')),
      transferred_by integer,
      created_at timestamptz default now(),
      updated_at timestamptz default now()
    );
    
    create table if not exists suppliers (
      id serial primary key,
      name text not null,
      email text,
      phone text,
      address jsonb,
      contact_person text,
      payment_terms text,
      notes jsonb,
      is_active boolean default true,
      created_at timestamptz default now(),
      updated_at timestamptz default now()
    );
    
    create table if not exists purchase_orders (
      id serial primary key,
      po_number text unique not null,
      supplier_id integer not null references suppliers(id) on delete restrict,
      status text default 'pending' check (status in ('pending', 'sent', 'confirmed', 'in_transit', 'received', 'cancelled')),
      items jsonb not null,
      total_amount numeric(12,2),
      due_date date,
      created_by integer,
      created_at timestamptz default now(),
      updated_at timestamptz default now()
    );
    
    create index if not exists idx_purchase_orders_supplier on purchase_orders(supplier_id);
    create index if not exists idx_purchase_orders_status on purchase_orders(status);
    
    create table if not exists purchase_order_items (
      id serial primary key,
      po_id integer not null references purchase_orders(id) on delete cascade,
      product_id integer references products(id) on delete restrict,
      variant_id integer references product_variants(id) on delete set null,
      quantity integer not null,
      unit_price numeric(10,2),
      total_price numeric(12,2),
      received_quantity integer default 0,
      created_at timestamptz default now()
    );
    
    create table if not exists barcodes (
      id serial primary key,
      barcode text unique not null,
      product_id integer references products(id) on delete set null,
      variant_id integer references product_variants(id) on delete set null,
      barcode_type text default 'EAN13',
      is_active boolean default true,
      created_at timestamptz default now()
    );
    
    create index if not exists idx_barcodes_barcode on barcodes(barcode);
    create index if not exists idx_barcodes_product on barcodes(product_id);
    
    -- Phase 4: POS
    create table if not exists pos_transactions (
      id serial primary key,
      transaction_number text unique not null,
      staff_id integer references staff_users(id) on delete set null,
      items jsonb not null,
      subtotal numeric(12,2) not null,
      tax numeric(12,2) default 0,
      discount numeric(12,2) default 0,
      total numeric(12,2) not null,
      payment_method text not null,
      status text default 'completed' check (status in ('pending', 'completed', 'cancelled', 'refunded')),
      created_at timestamptz default now(),
      updated_at timestamptz default now()
    );
    
    create table if not exists pos_sessions (
      id serial primary key,
      staff_id integer not null references staff_users(id) on delete restrict,
      opened_at timestamptz default now(),
      closed_at timestamptz,
      opening_amount numeric(12,2) not null default 0,
      closing_amount numeric(12,2),
      status text default 'open' check (status in ('open', 'closed'))
    );
    
    create index if not exists idx_pos_transactions_staff on pos_transactions(staff_id);
    create index if not exists idx_pos_transactions_created_at on pos_transactions(created_at);
    create index if not exists idx_pos_sessions_staff on pos_sessions(staff_id);
    
    -- Facebook/Instagram Shop
    create table if not exists fb_shop_config (
      id serial primary key,
      page_id text,
      access_token text,
      is_active boolean default false,
      created_at timestamptz default now(),
      updated_at timestamptz default now()
    );
    
    -- Recently Viewed Products
    create table if not exists recently_viewed_products (
      id serial primary key,
      user_id integer references users(id) on delete cascade,
      product_id integer references products(id) on delete cascade,
      viewed_at timestamptz default now(),
      session_id text,
      CHECK ((user_id IS NOT NULL) OR (session_id IS NOT NULL))
    );
    
    -- Product Recommendations
    create table if not exists product_recommendations (
      id serial primary key,
      user_id integer references users(id) on delete cascade,
      product_id integer references products(id) on delete cascade,
      recommended_product_id integer references products(id) on delete cascade,
      recommendation_type text not null check (recommendation_type in ('related', 'frequently_bought', 'based_on_browsing', 'trending', 'similar_category')),
      score numeric(5,2) default 0,
      created_at timestamptz default now()
    );
    
    -- WhatsApp Subscriptions
    create table if not exists whatsapp_subscriptions (
      id serial primary key,
      phone text not null unique,
      name text,
      subscribed_at timestamptz default now(),
      unsubscribed_at timestamptz,
      is_active boolean default true,
      source text,
      metadata jsonb,
      verification_code text,
      verified_at timestamptz
    );
    
    -- User Search History (for recommendations)
    create table if not exists user_search_history (
      id serial primary key,
      user_id integer references users(id) on delete cascade,
      search_query text not null,
      results_count integer default 0,
      session_id text,
      searched_at timestamptz default now()
    );
    
    -- Product Views Tracking (for trending products)
    create table if not exists product_views (
      id serial primary key,
      product_id integer references products(id) on delete cascade,
      user_id integer references users(id) on delete set null,
      session_id text,
      viewed_at timestamptz default now(),
      view_duration integer,
      source text
    );
    
    -- Store Settings table
    create table if not exists store_settings (
      id serial primary key,
      setting_key text unique not null,
      setting_value text,
      setting_type text default 'text',
      description text,
      is_public boolean default false,
      created_at timestamptz default now(),
      updated_at timestamptz default now()
    );
    
    create unique index if not exists uq_store_settings_key on store_settings(setting_key);
    create index if not exists idx_store_settings_key on store_settings(setting_key);
  `);
    // Ensure columns exist for recently_viewed_products (migration for existing tables)
    await pool.query(`
    DO $$
    BEGIN
      IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'recently_viewed_products') THEN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'recently_viewed_products' AND column_name = 'viewed_at') THEN
          ALTER TABLE recently_viewed_products ADD COLUMN viewed_at timestamptz default now();
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'recently_viewed_products' AND column_name = 'session_id') THEN
          ALTER TABLE recently_viewed_products ADD COLUMN session_id text;
        END IF;
      END IF;
      
      IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'product_views') THEN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'product_views' AND column_name = 'viewed_at') THEN
          ALTER TABLE product_views ADD COLUMN viewed_at timestamptz default now();
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'product_views' AND column_name = 'view_duration') THEN
          ALTER TABLE product_views ADD COLUMN view_duration integer;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'product_views' AND column_name = 'source') THEN
          ALTER TABLE product_views ADD COLUMN source text;
        END IF;
      END IF;
      
      IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'user_search_history') THEN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_search_history' AND column_name = 'searched_at') THEN
          ALTER TABLE user_search_history ADD COLUMN searched_at timestamptz default now();
        END IF;
      END IF;
    END $$;
  `);
    // Create all indexes after all tables are created and columns are ensured
    await pool.query(`
    -- Indexes for product_recommendations
    CREATE INDEX IF NOT EXISTS idx_recommendations_user ON product_recommendations(user_id);
    CREATE INDEX IF NOT EXISTS idx_recommendations_product ON product_recommendations(product_id);
    CREATE INDEX IF NOT EXISTS idx_recommendations_type ON product_recommendations(recommendation_type);
    
    -- Indexes for whatsapp_subscriptions
    CREATE INDEX IF NOT EXISTS idx_whatsapp_phone ON whatsapp_subscriptions(phone);
    CREATE INDEX IF NOT EXISTS idx_whatsapp_active ON whatsapp_subscriptions(is_active);
    
    -- Indexes for user_search_history
    CREATE INDEX IF NOT EXISTS idx_search_history_user ON user_search_history(user_id);
    CREATE INDEX IF NOT EXISTS idx_search_history_session ON user_search_history(session_id);
    CREATE INDEX IF NOT EXISTS idx_search_history_searched_at ON user_search_history(searched_at DESC);
    
    -- Indexes for recently_viewed_products
    CREATE UNIQUE INDEX IF NOT EXISTS unique_user_product 
    ON recently_viewed_products(user_id, product_id) 
    WHERE user_id IS NOT NULL;
    
    CREATE UNIQUE INDEX IF NOT EXISTS unique_session_product 
    ON recently_viewed_products(session_id, product_id) 
    WHERE session_id IS NOT NULL AND user_id IS NULL;
    
    CREATE INDEX IF NOT EXISTS idx_recently_viewed_user ON recently_viewed_products(user_id);
    CREATE INDEX IF NOT EXISTS idx_recently_viewed_product ON recently_viewed_products(product_id);
    CREATE INDEX IF NOT EXISTS idx_recently_viewed_session ON recently_viewed_products(session_id);
    CREATE INDEX IF NOT EXISTS idx_recently_viewed_viewed_at ON recently_viewed_products(viewed_at DESC);
    
    -- Indexes for product_views
    CREATE INDEX IF NOT EXISTS idx_product_views_product ON product_views(product_id);
    CREATE INDEX IF NOT EXISTS idx_product_views_viewed_at ON product_views(viewed_at DESC);
    CREATE INDEX IF NOT EXISTS idx_product_views_session ON product_views(session_id);
  `);
    // Order Cancellations and Refunds
    await pool.query(`
    CREATE TABLE IF NOT EXISTS order_cancellations (
      id serial primary key,
      order_id integer not null references orders(id) on delete restrict,
      order_number text not null,
      user_id integer references users(id) on delete set null,
      cancellation_reason text not null,
      cancellation_type text not null default 'full' check (cancellation_type in ('full', 'partial')),
      items_to_cancel jsonb,
      refund_amount numeric(12,2) not null,
      refund_status text not null default 'pending' check (refund_status in ('pending', 'processing', 'processed', 'failed', 'rejected')),
      refund_method text,
      refund_id text,
      razorpay_refund_id text,
      status text not null default 'pending' check (status in ('pending', 'approved', 'rejected', 'cancelled')),
      admin_notes text,
      processed_by integer references staff_users(id) on delete set null,
      processed_at timestamptz,
      created_at timestamptz default now(),
      updated_at timestamptz default now()
    );
    
    CREATE INDEX IF NOT EXISTS idx_order_cancellations_order ON order_cancellations(order_id);
    CREATE INDEX IF NOT EXISTS idx_order_cancellations_order_number ON order_cancellations(order_number);
    CREATE INDEX IF NOT EXISTS idx_order_cancellations_user ON order_cancellations(user_id);
    CREATE INDEX IF NOT EXISTS idx_order_cancellations_status ON order_cancellations(status);
    CREATE INDEX IF NOT EXISTS idx_order_cancellations_refund_status ON order_cancellations(refund_status);
    CREATE INDEX IF NOT EXISTS idx_order_cancellations_created_at ON order_cancellations(created_at DESC);
  `);
    // Add cancellation and refund columns to orders table
    await pool.query(`
    ALTER TABLE orders ADD COLUMN IF NOT EXISTS delivered_at timestamptz;
    ALTER TABLE orders ADD COLUMN IF NOT EXISTS cancellation_requested_at timestamptz;
    ALTER TABLE orders ADD COLUMN IF NOT EXISTS can_cancel boolean default true;
    ALTER TABLE orders ADD COLUMN IF NOT EXISTS cancellation_deadline timestamptz;
  `);
    // Product Collections (Offers, New Arrivals, Best Sellers, Recommendations)
    await pool.query(`
    CREATE TABLE IF NOT EXISTS product_collections (
      id serial primary key,
      collection_type text not null check (collection_type in ('offers', 'new_arrivals', 'best_sellers', 'recommendations')),
      product_id integer references products(id) on delete cascade,
      title text,
      subtitle text,
      description text,
      image_url text,
      code text,
      expiry_date date,
      discount_percent numeric(5,2),
      discount_amount numeric(10,2),
      is_featured boolean default false,
      is_published boolean default false,
      order_index integer default 0,
      metadata jsonb default '{}'::jsonb,
      created_at timestamptz default now(),
      updated_at timestamptz default now()
    );
    
    CREATE INDEX IF NOT EXISTS idx_product_collections_type ON product_collections(collection_type);
    CREATE INDEX IF NOT EXISTS idx_product_collections_published ON product_collections(is_published);
    CREATE INDEX IF NOT EXISTS idx_product_collections_product ON product_collections(product_id);
    CREATE INDEX IF NOT EXISTS idx_product_collections_order ON product_collections(order_index);
  `);
    // Recommendation Posts (for admin to publish/show recommendations)
    await pool.query(`
    CREATE TABLE IF NOT EXISTS recommendation_posts (
      id serial primary key,
      title text not null,
      content text,
      image_url text,
      product_ids integer[],
      is_published boolean default false,
      published_at timestamptz,
      order_index integer default 0,
      metadata jsonb default '{}'::jsonb,
      created_at timestamptz default now(),
      updated_at timestamptz default now()
    );
    
    CREATE INDEX IF NOT EXISTS idx_recommendation_posts_published ON recommendation_posts(is_published);
    CREATE INDEX IF NOT EXISTS idx_recommendation_posts_order ON recommendation_posts(order_index);
  `);
    // Integration tables for Google and Social media
    await pool.query(`
    -- Google Connections
    CREATE TABLE IF NOT EXISTS google_connections (
      id serial primary key,
      service text not null,
      is_connected boolean default false,
      access_token text,
      refresh_token text,
      token_expires_at timestamptz,
      account_id text,
      account_name text,
      metadata jsonb default '{}'::jsonb,
      created_at timestamptz default now(),
      updated_at timestamptz default now()
    );
    
    CREATE INDEX IF NOT EXISTS idx_google_connections_service ON google_connections(service);
    
    -- Google Analytics
    CREATE TABLE IF NOT EXISTS google_analytics (
      id serial primary key,
      date_recorded date not null,
      impressions integer default 0,
      clicks integer default 0,
      ctr numeric(5,2) default 0,
      conversions integer default 0,
      conversion_value numeric(10,2) default 0,
      metadata jsonb default '{}'::jsonb,
      created_at timestamptz default now()
    );
    
    CREATE INDEX IF NOT EXISTS idx_google_analytics_date ON google_analytics(date_recorded);
    
    -- Google Campaigns
    CREATE TABLE IF NOT EXISTS google_campaigns (
      id serial primary key,
      campaign_id text unique,
      name text not null,
      status text,
      budget numeric(10,2),
      spent numeric(10,2) default 0,
      impressions integer default 0,
      clicks integer default 0,
      conversions integer default 0,
      metadata jsonb default '{}'::jsonb,
      created_at timestamptz default now(),
      updated_at timestamptz default now()
    );
    
    CREATE INDEX IF NOT EXISTS idx_google_campaigns_status ON google_campaigns(status);
    
    -- Social Connections
    CREATE TABLE IF NOT EXISTS social_connections (
      id serial primary key,
      platform text not null,
      is_connected boolean default false,
      access_token text,
      token_expires_at timestamptz,
      page_id text,
      account_id text,
      account_name text,
      metadata jsonb default '{}'::jsonb,
      created_at timestamptz default now(),
      updated_at timestamptz default now()
    );
    
    CREATE INDEX IF NOT EXISTS idx_social_connections_platform ON social_connections(platform);
    
    -- Social Posts
    CREATE TABLE IF NOT EXISTS social_posts (
      id serial primary key,
      platform text not null,
      post_id text,
      content text,
      image_url text,
      video_url text,
      posted_at timestamptz,
      likes integer default 0,
      comments integer default 0,
      shares integer default 0,
      reach integer default 0,
      metadata jsonb default '{}'::jsonb,
      created_at timestamptz default now(),
      updated_at timestamptz default now()
    );
    
    CREATE INDEX IF NOT EXISTS idx_social_posts_platform ON social_posts(platform);
    CREATE INDEX IF NOT EXISTS idx_social_posts_posted_at ON social_posts(posted_at);
    
    -- Social Stats
    CREATE TABLE IF NOT EXISTS social_stats (
      id serial primary key,
      platform text not null,
      date_recorded date not null,
      followers integer default 0,
      following integer default 0,
      posts integer default 0,
      engagement_rate numeric(5,2) default 0,
      metadata jsonb default '{}'::jsonb,
      created_at timestamptz default now()
    );
    
    CREATE INDEX IF NOT EXISTS idx_social_stats_platform_date ON social_stats(platform, date_recorded);
    
    -- AI Tasks
    CREATE TABLE IF NOT EXISTS ai_tasks (
      id serial primary key,
      name text not null,
      description text,
      status text default 'pending' check (status in ('pending', 'in_progress', 'completed', 'failed')),
      priority text default 'medium' check (priority in ('low', 'medium', 'high')),
      result jsonb,
      error_message text,
      created_at timestamptz default now(),
      updated_at timestamptz default now(),
      completed_at timestamptz
    );
    
    CREATE INDEX IF NOT EXISTS idx_ai_tasks_status ON ai_tasks(status);
    CREATE INDEX IF NOT EXISTS idx_ai_tasks_priority ON ai_tasks(priority);
  `);
    console.log('✅ Phase 3 & 4 tables created successfully');
    console.log('✅ Recently Viewed Products, Recommendations, and Subscriptions tables created');
    console.log('✅ Order Cancellations and Refunds tables created');
    console.log('✅ Product Collections and Recommendation Posts tables created');
    console.log('✅ Integration tables (Google, Social, AI) created successfully');
}
