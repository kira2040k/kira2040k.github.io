/* js/script.js - external JS for interactivity */


document.addEventListener('DOMContentLoaded', () => {
  
  const year = new Date().getFullYear();
  ['year','year-about','year-products','year-contact'].forEach(id=>{
    const el = document.getElementById(id);
    if(el) el.textContent = year;
  });

  
  document.querySelectorAll('.nav-toggle').forEach(btn => {
    btn.addEventListener('click', () => {
      const listId = btn.nextElementSibling ? btn.nextElementSibling.id : null;
      const nav = btn.nextElementSibling;
      if(nav){
        const isOpen = nav.style.display === 'flex' || nav.style.display === 'block';
        nav.style.display = isOpen ? 'none' : 'flex';
        btn.setAttribute('aria-expanded', String(!isOpen));
      }
    });
  });

  
  const slider = document.getElementById('imageSlider');
  if (slider) {
    const imgs = Array.from(slider.querySelectorAll('img'));
    let idx = 0;
    imgs.forEach((im, i) => { if(i===0) im.classList.add('active'); });

    function show(n) {
      imgs.forEach((img, i) => img.classList.toggle('active', i === n));
    }
    
    let auto = setInterval(()=>{ idx = (idx+1) % imgs.length; show(idx); }, 4000);

    
    const prevBtn = document.getElementById('prevBtn');
    const nextBtn = document.getElementById('nextBtn');
    if(prevBtn && nextBtn){
      prevBtn.addEventListener('click', () => { idx = (idx - 1 + imgs.length) % imgs.length; show(idx); resetAuto(); });
      nextBtn.addEventListener('click', () => { idx = (idx + 1) % imgs.length; show(idx); resetAuto(); });
    }
    function resetAuto(){ clearInterval(auto); auto = setInterval(()=>{ idx = (idx+1) % imgs.length; show(idx); }, 4000); }
  }

  
  document.querySelectorAll('.course-card .btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const course = btn.dataset.course || 'selected course';
      
      const select = document.getElementById('rcourse');
      if(select){
        for(const opt of select.options){
          if(opt.text === course){ opt.selected = true; break; }
        }
        
        document.querySelector('html, body').forEach?.(); 
        window.location.href = 'contact.html';
      } else {
        alert(`You clicked reserve for ${course} — go to Contact/Register to finish your booking.`);
      }
    });
  });

  
  const seatsEl = document.getElementById('seats');
  let seats = seatsEl ? parseInt(seatsEl.textContent, 10) : 12;
  const inc = document.getElementById('increase');
  const dec = document.getElementById('decrease');
  const bookBtn = document.getElementById('book-now');

  if(seatsEl){
    function updateSeats(){ seatsEl.textContent = seats; }
    if(inc) inc.addEventListener('click', ()=>{ seats += 1; updateSeats(); });
    if(dec) dec.addEventListener('click', ()=>{ if(seats>0) seats -= 1; updateSeats(); });
    if(bookBtn) bookBtn.addEventListener('click', ()=>{
      if(seats <= 0){ alert('No seats remaining.'); return; }
      seats -= 1; updateSeats();
      alert('One seat booked. Please complete registration in Contact page.');
    });
  }

  
  const contactForm = document.getElementById('contactForm');
  const registerForm = document.getElementById('registerForm');

  function showFeedback(el, text, ok = true){
    el.textContent = text;
    el.style.color = ok ? 'green' : 'crimson';
  }

  if(contactForm){
    contactForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const name = contactForm.name.value.trim();
      const email = contactForm.email.value.trim();
      const message = contactForm.message.value.trim();
      const fb = document.getElementById('contactFeedback');

      if(name.length < 3){ showFeedback(fb,'Please enter a valid name (min 3 characters)', false); return; }
      if(!/^\S+@\S+\.\S+$/.test(email)){ showFeedback(fb,'Please enter a valid email address', false); return; }
      if(message.length < 10){ showFeedback(fb,'Message should be at least 10 characters', false); return; }

      
      showFeedback(fb,'Thanks! Your message was sent — we will reply soon.');
      contactForm.reset();
    });
  }

  if(registerForm){
    registerForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const name = registerForm.name.value.trim();
      const email = registerForm.email.value.trim();
      const course = registerForm.course.value;
      const fb = document.getElementById('registerFeedback');

      if(name.length < 3){ showFeedback(fb,'Please enter your full name', false); return; }
      if(!/^\S+@\S+\.\S+$/.test(email)){ showFeedback(fb,'Please enter a valid email', false); return; }
      if(!course){ showFeedback(fb,'Select a course', false); return; }

      
      
      showFeedback(fb,`Thank you ${name}! You are registered for ${course}.`);
      registerForm.reset();
    });
  }

  
  document.addEventListener('click', (ev) => {
    document.querySelectorAll('.nav-list').forEach(nav => {
      if(window.innerWidth <= 900 && !nav.contains(ev.target) && !nav.previousElementSibling?.contains(ev.target)) {
        nav.style.display = 'none';
        nav.previousElementSibling?.setAttribute('aria-expanded', 'false');
      }
    });
  });

});
