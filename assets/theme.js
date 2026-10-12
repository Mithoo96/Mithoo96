(() => {
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ------------------------------------------------------------------------
     Scroll reveal
     ------------------------------------------------------------------------ */
  const revealObserver =
    'IntersectionObserver' in window
      ? new IntersectionObserver(
          (entries) => {
            entries.forEach((entry) => {
              if (!entry.isIntersecting) return;
              entry.target.classList.add('is-visible');
              revealObserver.unobserve(entry.target);
            });
          },
          { rootMargin: '0px 0px -8% 0px', threshold: 0.12 }
        )
      : null;

  const initReveal = (root = document) => {
    root.querySelectorAll('[data-reveal]:not(.is-visible)').forEach((el) => {
      if (revealObserver && !reduceMotion) revealObserver.observe(el);
      else el.classList.add('is-visible');
    });
  };

  /* ------------------------------------------------------------------------
     Count-up numbers
     ------------------------------------------------------------------------ */
  const countUp = (el) => {
    const target = parseFloat(el.dataset.countTo);
    if (Number.isNaN(target) || reduceMotion) return;
    const duration = 1600;
    const start = performance.now();
    const tick = (now) => {
      const progress = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      el.textContent = Math.round(target * eased);
      if (progress < 1) requestAnimationFrame(tick);
    };
    el.textContent = '0';
    requestAnimationFrame(tick);
  };

  const countObserver =
    'IntersectionObserver' in window
      ? new IntersectionObserver(
          (entries) => {
            entries.forEach((entry) => {
              if (!entry.isIntersecting) return;
              countUp(entry.target);
              countObserver.unobserve(entry.target);
            });
          },
          { threshold: 0.6 }
        )
      : null;

  const initCounters = (root = document) => {
    if (!countObserver) return;
    root.querySelectorAll('[data-count-to]').forEach((el) => countObserver.observe(el));
  };

  /* ------------------------------------------------------------------------
     Header: shadow on scroll, drawer position
     ------------------------------------------------------------------------ */
  const header = document.querySelector('.header');
  if (header) {
    const onScroll = () => header.classList.toggle('is-scrolled', window.scrollY > 10);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
  }

  document.addEventListener('toggle', (event) => {
    const drawer = event.target;
    if (!(drawer instanceof HTMLDetailsElement) || !drawer.matches('[data-menu-drawer]')) return;
    const bottom = header ? header.getBoundingClientRect().bottom : 0;
    drawer.style.setProperty('--drawer-top', `${Math.max(bottom, 0)}px`);
    document.body.style.overflow = drawer.open ? 'hidden' : '';
  }, true);

  document.addEventListener('keydown', (event) => {
    if (event.key !== 'Escape') return;
    document.querySelectorAll('[data-menu-drawer][open]').forEach((drawer) => {
      drawer.open = false;
      drawer.querySelector('summary')?.focus();
    });
  });

  /* ------------------------------------------------------------------------
     Quantity buttons
     ------------------------------------------------------------------------ */
  document.addEventListener('click', (event) => {
    const button = event.target.closest('[data-quantity-minus], [data-quantity-plus]');
    if (!button) return;
    const input = button.parentElement.querySelector('input[type="number"]');
    if (!input) return;
    const min = parseInt(input.min || '0', 10);
    const step = button.hasAttribute('data-quantity-plus') ? 1 : -1;
    input.value = Math.max(min, (parseInt(input.value, 10) || 0) + step);
    input.dispatchEvent(new Event('change', { bubbles: true }));
  });

  // Cart page: apply quantity changes immediately.
  document.addEventListener('change', (event) => {
    const input = event.target.closest('[data-cart-quantity]');
    if (!input) return;
    clearTimeout(input._timer);
    input._timer = setTimeout(() => input.form.submit(), 500);
  });

  /* ------------------------------------------------------------------------
     Collection sorting
     ------------------------------------------------------------------------ */
  document.addEventListener('change', (event) => {
    if (event.target.matches('[data-sort-select]')) event.target.form.submit();
  });

  /* ------------------------------------------------------------------------
     Product: variant picker + AJAX add to cart
     ------------------------------------------------------------------------ */
  const formatMoney = (cents) => {
    const currency = window.Shopify?.currency?.active || 'USD';
    const locale = document.documentElement.lang || 'en';
    return new Intl.NumberFormat(locale, { style: 'currency', currency }).format(cents / 100);
  };

  class ProductInfo extends HTMLElement {
    connectedCallback() {
      this.variantData = this.querySelector('[data-variants]');
      this.variants = this.variantData ? JSON.parse(this.variantData.textContent) : [];
      this.form = this.querySelector('[data-product-form]');
      this.idInput = this.querySelector('[data-variant-id]');
      this.submit = this.querySelector('[data-add-to-cart]');
      this.submitText = this.querySelector('[data-add-to-cart-text]');
      this.error = this.querySelector('[data-form-error]');
      this.labels = {
        add: this.submitText?.textContent.trim(),
        soldOut: window.themeStrings?.soldOut || 'Sold out',
        unavailable: window.themeStrings?.unavailable || 'Unavailable',
        added: window.themeStrings?.added || 'Added',
      };
      if (this.submitText && this.submit.disabled) this.labels.add = window.themeStrings?.addToCart || 'Add to cart';

      this.addEventListener('change', (event) => {
        if (event.target.matches('[data-option-index]')) this.onOptionChange();
      });
      this.form?.addEventListener('submit', (event) => this.onSubmit(event));
      this.updateAvailability();
    }

    selectedOptions() {
      return Array.from(this.querySelectorAll('.variant-picker__option')).map(
        (fieldset) => fieldset.querySelector('input:checked')?.value
      );
    }

    onOptionChange() {
      const options = this.selectedOptions();
      options.forEach((value, index) => {
        const label = this.querySelector(`[data-option-value="${index}"]`);
        if (label) label.textContent = value;
      });

      const variant = this.variants.find((v) => v.options.every((opt, i) => opt === options[i]));
      this.updateAvailability();

      if (!variant) {
        this.setButton(false, this.labels.unavailable);
        return;
      }

      this.idInput.value = variant.id;
      this.setButton(variant.available, variant.available ? this.labels.add : this.labels.soldOut);
      this.renderPrice(variant);

      if (variant.featured_media) this.showMedia(variant.featured_media.id);

      const url = new URL(window.location.href);
      url.searchParams.set('variant', variant.id);
      window.history.replaceState({}, '', url.toString());
    }

    updateAvailability() {
      const options = this.selectedOptions();
      this.querySelectorAll('[data-option-index]').forEach((input) => {
        const index = parseInt(input.dataset.optionIndex, 10);
        const candidate = [...options];
        candidate[index] = input.value;
        const available = this.variants.some(
          (v) => v.available && v.options.every((opt, i) => opt === candidate[i])
        );
        input.nextElementSibling?.classList.toggle('is-unavailable', !available);
      });
    }

    renderPrice(variant) {
      const container = this.querySelector('[data-price] .price');
      if (!container) return;
      const onSale = variant.compare_at_price > variant.price;
      container.classList.toggle('price--on-sale', onSale);
      container.classList.toggle('price--sold-out', !variant.available);
      const regular = container.querySelector('.price__regular');
      if (regular) regular.textContent = formatMoney(variant.price);
      let compare = container.querySelector('.price__compare');
      if (onSale) {
        if (!compare) {
          compare = document.createElement('s');
          compare.className = 'price__compare';
          regular.after(compare);
        }
        compare.textContent = formatMoney(variant.compare_at_price);
      } else if (compare) {
        compare.remove();
      }
    }

    showMedia(mediaId) {
      const item = this.querySelector(`[data-media-id="${mediaId}"]`);
      const gallery = item?.parentElement;
      if (!item || !gallery || gallery.firstElementChild === item) return;
      gallery.prepend(item);
      if (!reduceMotion) {
        item.animate([{ opacity: 0, transform: 'scale(0.98)' }, { opacity: 1, transform: 'none' }], {
          duration: 500,
          easing: 'cubic-bezier(0.22, 1, 0.36, 1)',
        });
      }
    }

    setButton(enabled, text) {
      if (!this.submit) return;
      this.submit.disabled = !enabled;
      if (this.submitText) this.submitText.textContent = text;
    }

    async onSubmit(event) {
      if (!window.fetch) return;
      event.preventDefault();
      if (this.submit.disabled) return;
      this.submit.classList.add('is-loading');
      if (this.error) this.error.hidden = true;

      try {
        const response = await fetch(`${window.Shopify?.routes?.root || '/'}cart/add.js`, {
          method: 'POST',
          headers: { Accept: 'application/json' },
          body: new FormData(this.form),
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.description || data.message);

        const cart = await fetch(`${window.Shopify?.routes?.root || '/'}cart.js`).then((r) => r.json());
        updateCartCount(cart.item_count);
        this.submitText.textContent = this.labels.added;
        setTimeout(() => (this.submitText.textContent = this.labels.add), 2000);
      } catch (error) {
        if (this.error) {
          this.error.textContent = error.message;
          this.error.hidden = false;
        }
      } finally {
        this.submit.classList.remove('is-loading');
      }
    }
  }

  const updateCartCount = (count) => {
    document.querySelectorAll('[data-cart-count]').forEach((el) => {
      el.textContent = count;
      el.classList.toggle('is-empty', count === 0);
      el.classList.remove('is-bumped');
      void el.offsetWidth;
      el.classList.add('is-bumped');
    });
  };

  if (!customElements.get('product-info')) customElements.define('product-info', ProductInfo);

  /* ------------------------------------------------------------------------
     Product recommendations (loaded asynchronously)
     ------------------------------------------------------------------------ */
  class ProductRecommendations extends HTMLElement {
    connectedCallback() {
      if (this.children.length || !this.dataset.url) return;
      const observer = new IntersectionObserver(
        (entries) => {
          if (!entries[0].isIntersecting) return;
          observer.disconnect();
          fetch(this.dataset.url)
            .then((r) => r.text())
            .then((html) => {
              const doc = new DOMParser().parseFromString(html, 'text/html');
              const fresh = doc.querySelector('product-recommendations');
              if (fresh && fresh.innerHTML.trim()) {
                this.innerHTML = fresh.innerHTML;
                initReveal(this);
              }
            })
            .catch(() => {});
        },
        { rootMargin: '0px 0px 400px 0px' }
      );
      observer.observe(this);
    }
  }

  if (!customElements.get('product-recommendations')) {
    customElements.define('product-recommendations', ProductRecommendations);
  }

  /* ------------------------------------------------------------------------
     Share button
     ------------------------------------------------------------------------ */
  document.addEventListener('click', async (event) => {
    const button = event.target.closest('[data-share]');
    if (!button) return;
    const { url, title } = button.dataset;
    try {
      if (navigator.share) await navigator.share({ url, title });
      else {
        await navigator.clipboard.writeText(url);
        const original = button.textContent;
        button.textContent = window.themeStrings?.linkCopied || 'Link copied';
        setTimeout(() => (button.textContent = original), 2000);
      }
    } catch (_) {
      /* share dismissed */
    }
  });

  /* ------------------------------------------------------------------------
     Boot + theme editor support
     ------------------------------------------------------------------------ */
  initReveal();
  initCounters();

  document.addEventListener('shopify:section:load', (event) => {
    initReveal(event.target);
    initCounters(event.target);
  });

  // Make every element visible inside the theme editor when a block is selected.
  document.addEventListener('shopify:block:select', (event) => {
    event.target.closest('[data-reveal]')?.classList.add('is-visible');
    event.target.querySelectorAll?.('[data-reveal]').forEach((el) => el.classList.add('is-visible'));
  });
})();
