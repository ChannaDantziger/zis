function Gallery() {
  const { lang, t } = U.useLang();
  const photos = D.GALLERY;
  const [active, setActive] = suseState(null);
  const closeButton = suseRef(null);
  const openedFrom = suseRef(null);

  suseEffect(() => {
    if (active === null) return;
    closeButton.current?.focus();
    const onKey = event => {
      if (event.key === 'Escape') setActive(null);
      if (event.key === 'ArrowLeft') setActive(index => (index + 1) % photos.length);
      if (event.key === 'ArrowRight') setActive(index => (index - 1 + photos.length) % photos.length);
      if (event.key === 'Tab') {
        const controls = [...document.querySelectorAll('.gallery-dialog button')];
        const first = controls[0];
        const last = controls[controls.length - 1];
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first.focus();
        }
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [active, photos.length]);

  const open = (index, event) => {
    openedFrom.current = event.currentTarget;
    setActive(index);
  };
  const close = () => {
    setActive(null);
    requestAnimationFrame(() => openedFrom.current?.focus());
  };
  const move = offset => setActive(index => (index + offset + photos.length) % photos.length);

  return (
    <section id="gallery" className="gallery">
      <div className="container">
        <U.SectionTitle eyebrow={t.sections.gallery.eyebrow} title={t.sections.gallery.title} num="03" />
        <div className="gallery-grid">
          {photos.map((photo, index) => (
            <button type="button" className="gallery-tile" key={photo.src}
              onClick={event => open(index, event)} aria-label={`${lang === 'he' ? 'הגדלת תמונה' : 'Open image'} ${index + 1}`}>
              <img src={photo.src} alt={photo.alt[lang]} loading="lazy" />
            </button>
          ))}
        </div>
      </div>
      {active !== null && (
        <div className="gallery-overlay" onClick={close}>
          <div className="gallery-dialog" role="dialog" aria-modal="true"
            aria-label={lang === 'he' ? 'גלריית תמונות' : 'Image gallery'} onClick={event => event.stopPropagation()}>
            <button type="button" ref={closeButton} className="gallery-close" onClick={close}
              aria-label={lang === 'he' ? 'סגירה' : 'Close'}>×</button>
            <div className="gallery-stage">
              <button type="button" className="gallery-arrow" onClick={() => move(-1)}
                aria-label={lang === 'he' ? 'תמונה קודמת' : 'Previous image'}>‹</button>
              <img src={photos[active].src} alt={photos[active].alt[lang]} />
              <button type="button" className="gallery-arrow" onClick={() => move(1)}
                aria-label={lang === 'he' ? 'תמונה הבאה' : 'Next image'}>›</button>
            </div>
            <div className="gallery-thumbs" aria-label={lang === 'he' ? 'תמונות נוספות' : 'Other images'}>
              {photos.map((photo, index) => (
                <button type="button" key={photo.src} className={index === active ? 'active' : ''}
                  onClick={() => setActive(index)} aria-label={`${lang === 'he' ? 'תמונה' : 'Image'} ${index + 1}`}
                  aria-current={index === active ? 'true' : undefined}>
                  <img src={photo.src} alt="" />
                </button>
              ))}
            </div>
            <p className="gallery-caption">{photos[active].alt[lang]}</p>
          </div>
        </div>
      )}
    </section>
  );
}
