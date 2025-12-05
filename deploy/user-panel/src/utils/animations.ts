// Animation utilities for Natura Bissé style animations

export const scrollToSection = (sectionId: string, offset: number = 80) => {
  const element = document.getElementById(sectionId)
  if (element) {
    const elementPosition = element.getBoundingClientRect().top
    const offsetPosition = elementPosition + window.pageYOffset - offset

    window.scrollTo({
      top: offsetPosition,
      behavior: 'smooth'
    })
  }
}

export const initParallax = (element: HTMLElement, speed: number = 0.5) => {
  const handleScroll = () => {
    const scrolled = window.pageYOffset
    const parallaxValue = scrolled * speed
    element.style.transform = `translateY(${parallaxValue}px)`
  }

  window.addEventListener('scroll', handleScroll, { passive: true })

  return () => {
    window.removeEventListener('scroll', handleScroll)
  }
}

export const initCountUp = (
  element: HTMLElement,
  target: number,
  duration: number = 2000,
  suffix: string = '%'
) => {
  let start = 0
  const startTime = Date.now()

  const animate = () => {
    const elapsed = Date.now() - startTime
    const progress = Math.min(elapsed / duration, 1)
    
    // Ease-out quart
    const easeOutQuart = 1 - Math.pow(1 - progress, 4)
    const current = Math.floor(start + (target - start) * easeOutQuart)
    
    element.textContent = `${current}${suffix}`
    
    if (progress < 1) {
      requestAnimationFrame(animate)
    } else {
      element.textContent = `${target}${suffix}`
    }
  }

  animate()
}

