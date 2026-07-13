(() => {
  const slides = [...document.querySelectorAll('.hero-slide')];
  const dots = [...document.querySelectorAll('.hero-dots button')];
  const hero = document.querySelector('.premium-hero');
  const header = document.querySelector('.header');
  if (header) {
    const syncHeader = () => header.classList.toggle('scrolled', window.scrollY > 24);
    syncHeader();
    addEventListener('scroll', syncHeader, { passive: true });
  }
  if (!slides.length) return;
  let active = 0;
  let timer;
  const show = index => {
    active = (index + slides.length) % slides.length;
    slides.forEach((slide, i) => slide.classList.toggle('active', i === active));
    dots.forEach((dot, i) => dot.classList.toggle('active', i === active));
  };
  const play = () => {
    clearInterval(timer);
    if (!matchMedia('(prefers-reduced-motion: reduce)').matches) timer = setInterval(() => show(active + 1), 6500);
  };
  dots.forEach((dot, i) => dot.addEventListener('click', () => { show(i); play(); }));
  hero?.addEventListener('mouseenter', () => clearInterval(timer));
  hero?.addEventListener('mouseleave', play);
  document.addEventListener('visibilitychange', () => document.hidden ? clearInterval(timer) : play());
  show(0);
  play();
})();
