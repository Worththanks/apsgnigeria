(function (root, factory) {
    const api = factory();
    if (typeof module === 'object' && module.exports) module.exports = api;
    else root.APSGRegistrationPresentation = api;
})(typeof globalThis === 'object' ? globalThis : this, function () {
    'use strict';

    // @spec REG-UI-010, REG-UI-011, REG-UI-013, REG-UI-020
    function actionPlacement({ width, height, actionHeight, dialog = false, keyboard = false, fallbackEditing = false }) {
        return width < 768 && height >= 480 && actionHeight <= height / 4 && !dialog && !keyboard && !fallbackEditing ? 'bottom' : 'flow';
    }

    // @spec REG-UI-012, REG-UI-013
    function createKeyboardTracker() {
        let baseline = 0;
        let orientation = null;
        return {
            update(state) {
                if (orientation !== state.orientation) { orientation = state.orientation; baseline = 0; }
                const naturalScale = state.scale >= .9 && state.scale <= 1.1;
                if (!state.editing && naturalScale) baseline = state.height;
                return Boolean(state.editing && naturalScale && baseline && baseline - state.height > 140);
            },
            hasReference() { return baseline > 0; }
        };
    }

    // @spec REG-UI-017
    function fieldMessage(control, label) {
        if (control.disabled) return '';
        if (control.required && control.type === 'checkbox' && !control.checked) return 'Confirm your consent to continue.';
        if (control.required && !String(control.value || '').trim()) return `${control.tagName === 'SELECT' ? 'Choose' : 'Enter'} ${label}.`;
        if (control.validity?.customError) return control.validationMessage;
        if (control.validity?.typeMismatch && control.type === 'email') return 'Enter a valid email address.';
        if (control.validity?.patternMismatch) return `Check the format of ${label}.`;
        if (control.validity?.valid === false) return control.validationMessage || `Check ${label}.`;
        return '';
    }

    // @spec REG-UI-007, REG-UI-009, REG-UI-010, REG-UI-011, REG-UI-012, REG-UI-013, REG-UI-017, REG-UI-018, REG-UI-019, REG-UI-020, REG-UI-021, REG-UI-022, REG-UI-023, REG-UI-024, REG-UI-025, REG-UI-026, REG-UI-027, REG-UI-028, REG-UI-029, REG-UI-030, REG-UI-033
    function create({ window: win, form, isBusy = () => false, onDismiss = {} }) {
        const doc = win.document;
        const byId = id => doc.getElementById(id);
        const reduceMotion = () => win.matchMedia('(prefers-reduced-motion: reduce)').matches;
        const tracker = createKeyboardTracker();
        const dock = byId('registrationActionBar');
        const summary = byId('registrationErrorSummary');
        const errors = new Map();
        const homes = new Map();
        const buttons = [byId('continueRegistrationBtn'), byId('previewBtn')];
        let stage = 1;
        let current = null;
        let origin = null;
        let frame = 0;
        let pointerHeld = false;
        let background = null;
        const dialogs = ['previewModal', 'duplicateMemberModal', 'successModal'].map(byId);
        const dialogFrame = byId('registrationDialog');
        const fallbackShade = doc.createElement('div');
        fallbackShade.className = 'registration-fallback-backdrop';
        fallbackShade.hidden = true;
        doc.body.append(fallbackShade);
        fallbackShade.addEventListener('click', () => { if (current) dismiss(current); });
        doc.querySelectorAll('i.fas,i.fa,.spinner').forEach(icon => icon.setAttribute('aria-hidden', 'true'));

        function focus(element, scroll = true) {
            if (!element?.isConnected || element.disabled || element.closest('[hidden],.hidden') || element.inert) return;
            element.focus({ preventScroll: true });
            if (scroll) element.scrollIntoView({ block: 'center', behavior: reduceMotion() ? 'auto' : 'smooth' });
        }

        function editing() {
            return doc.activeElement?.matches('textarea,select,input:not([type="checkbox"]):not([type="radio"]):not([type="file"]):not([type="button"]):not([type="hidden"]),[contenteditable="true"]');
        }

        buttons.forEach(button => {
            const marker = doc.createComment(`registration action: ${button.id}`);
            button.before(marker);
            homes.set(button, marker);
        });

        function refresh() {
            frame = 0;
            if (pointerHeld) return;
            const viewport = win.visualViewport;
            const height = viewport?.height || win.innerHeight;
            const scale = viewport?.scale || 1;
            const orientation = win.innerWidth > win.innerHeight ? 'landscape' : 'portrait';
            const hasFocus = editing();
            const keyboard = tracker.update({ height, scale, editing: hasFocus, orientation });
            doc.documentElement.style.setProperty('--registration-viewport-height', `${height}px`);
            const primary = stage === 1 ? buttons[0] : stage === 2 ? buttons[1] : null;
            const style = win.getComputedStyle(dock);
            const actionHeight = primary ? primary.getBoundingClientRect().height + parseFloat(style.paddingTop) + parseFloat(style.paddingBottom) + 2 : 0;
            const mode = primary ? actionPlacement({ width: win.innerWidth, height, actionHeight, dialog: Boolean(current), keyboard,
                fallbackEditing: hasFocus && (!viewport || !tracker.hasReference()) }) : 'flow';
            const wasFocused = doc.activeElement;
            dock.hidden = mode !== 'bottom';
            buttons.forEach(button => {
                const target = mode === 'bottom' && button === primary ? dock : homes.get(button).parentNode;
                if (button.parentNode !== target) {
                    if (target === dock) target.append(button);
                    else homes.get(button).after(button);
                    if (wasFocused === button && !current) button.focus({ preventScroll: true });
                }
            });
            dock.dataset.mode = mode;
            doc.documentElement.style.setProperty('--registration-action-space', mode === 'bottom' ? `${Math.ceil(actionHeight + 16)}px` : '0px');
        }
        function schedule() { if (!frame) frame = win.requestAnimationFrame(refresh); }

        function holdBackground() {
            if (background) return;
            background = new Map();
            [...doc.body.children].filter(node => node !== dialogFrame && node !== dock && node !== fallbackShade).forEach(node => {
                background.set(node, node.inert);
                node.inert = true;
            });
        }
        function restoreBackground() {
            background?.forEach((inert, node) => { node.inert = inert; });
            background = null;
        }
        function hide(dialog) {
            dialog.hidden = true;
            dialog.inert = true;
            dialog.classList.add('hidden');
        }
        // @spec REG-UI-019, REG-UI-020, REG-UI-022, REG-UI-024, REG-UI-028, REG-UI-030
        function open(id) {
            const dialog = byId(id);
            if (!dialog || !dialogs.includes(dialog)) return;
            if (!current) origin = doc.activeElement;
            if (current && current !== dialog) hide(current);
            current = dialog;
            dialogs.filter(section => section !== dialog).forEach(hide);
            const reviewError = byId('registrationReviewError');
            if (id === 'previewModal') { reviewError.hidden = true; reviewError.replaceChildren(); }
            dialog.hidden = false; dialog.inert = false; dialog.classList.remove('hidden');
            dialogFrame.setAttribute('aria-labelledby',dialog.getAttribute('aria-labelledby'));
            dialogFrame.hidden = false; dialogFrame.inert = false; dialogFrame.classList.remove('hidden');
            if (typeof dialogFrame.showModal === 'function') {
                if (!dialogFrame.open) dialogFrame.showModal();
                fallbackShade.hidden = true; restoreBackground();
            } else {
                fallbackShade.hidden = false; holdBackground();
                dialogFrame.setAttribute('open','');
                dialogFrame.setAttribute('role','dialog');
                dialogFrame.setAttribute('aria-modal','true');
            }
            doc.body.classList.add('registration-modal-scroll');
            focus(dialog.querySelector('[data-dialog-heading]'),false);
            refresh();
        }
        function close(id,{restore=true,force=false,target}={}) {
            if (isBusy() && !force) return false;
            const dialog = byId(id);
            if (!dialog || !dialogs.includes(dialog)) return false;
            const active = current === dialog;
            hide(dialog);
            if (active) {
                current = null;
                if (typeof dialogFrame.close === 'function' && dialogFrame.open) dialogFrame.close();
                dialogFrame.removeAttribute('open'); dialogFrame.hidden = true; dialogFrame.inert = true; dialogFrame.classList.add('hidden');
                fallbackShade.hidden = true; restoreBackground();
                doc.body.classList.remove('registration-modal-scroll');
                if (restore) focus(target || origin,false);
                origin = null;
            }
            schedule(); return true;
        }
        function dismiss(dialog,detail={}) {
            if (!dialog || isBusy() || dialog.id === 'successModal') return;
            onDismiss[dialog.id]?.(detail);
        }
        dialogFrame.addEventListener('cancel',event => { event.preventDefault(); dismiss(current); });
        dialogFrame.addEventListener('click',event => { if (event.target === dialogFrame) dismiss(current); });
        dialogFrame.addEventListener('keydown',event => {
            if (!current) return;
            if (event.key === 'Escape' && typeof dialogFrame.showModal !== 'function') { event.preventDefault(); dismiss(current); }
            if (event.key !== 'Tab') return;
            const focusable = [...current.querySelectorAll('button,a[href],input,select,textarea,[tabindex="0"]')].filter(node => !node.disabled && !node.closest('[hidden],.hidden,[inert]') && node.getClientRects().length);
            const first=focusable[0],last=focusable.at(-1);
            if (!first) { event.preventDefault(); focus(current.querySelector('[data-dialog-heading]'),false); }
            else if (event.shiftKey && (doc.activeElement===first || !focusable.includes(doc.activeElement))) { event.preventDefault(); last.focus(); }
            else if (!event.shiftKey && doc.activeElement===last) { event.preventDefault(); first.focus(); }
        });

        function labelFor(control) {
            if (control.id === 'consent') return 'Consent';
            return (doc.querySelector(`label[for="${control.id}"]`)?.textContent || control.id).replace(/\s*\*\s*$/, '').trim();
        }
        function messageFor(control) {
            const label = labelFor(control);
            if (control.disabled && control.required && !control.value) return `Choose ${label} after selecting the preceding location or role.`;
            return fieldMessage(control, label);
        }
        function clearField(control) {
            const id = `${control.id}RegistrationError`;
            byId(id)?.remove();
            control.classList.remove('invalid-input');
            control.removeAttribute('aria-invalid');
            const descriptions = (control.getAttribute('aria-describedby') || '').split(/\s+/).filter(value => value && value !== id);
            if (descriptions.length) control.setAttribute('aria-describedby', descriptions.join(' '));
            else control.removeAttribute('aria-describedby');
            errors.delete(control.id);
        }
        function markField(control, message) {
            clearField(control);
            if (!message) return;
            errors.set(control.id, message);
            control.classList.add('invalid-input');
            control.setAttribute('aria-invalid', 'true');
            const error = doc.createElement('p');
            error.id = `${control.id}RegistrationError`;
            error.className = 'registration-field-error';
            error.textContent = message;
            (control.closest('.field-card') || control.parentElement).append(error);
            control.setAttribute('aria-describedby', [control.getAttribute('aria-describedby'), error.id].filter(Boolean).join(' '));
        }
        function correctField(id) {
            if (current?.id === 'previewModal') dismiss(current, { edit: true, field: id });
            win.requestAnimationFrame(() => {
                let control = byId(id);
                if (control?.disabled) control = byId(id === 'designation' ? 'level' : (id === 'ward' && !byId('lga').disabled ? 'lga' : 'state'));
                focus(control);
            });
        }
        function renderErrors() {
            summary.replaceChildren();
            summary.hidden = !errors.size;
            if (!errors.size) return;
            const title = doc.createElement('strong');
            title.textContent = `Please check ${errors.size === 1 ? 'this field' : `these ${errors.size} fields`}`;
            const list = doc.createElement('ul');
            errors.forEach((message, id) => {
                const item = doc.createElement('li'), link = doc.createElement('a');
                link.href = `#${id}`;
                link.textContent = message;
                link.addEventListener('click', event => { event.preventDefault(); correctField(id); });
                item.append(link); list.append(item);
            });
            summary.append(title, list);
            schedule();
        }
        function validate() {
            for (const control of form.querySelectorAll('input,select,textarea')) {
                if (!control.id || ['button','submit','hidden'].includes(control.type)) continue;
                markField(control, messageFor(control));
            }
            renderErrors();
            if (errors.size) focus(summary);
            return !errors.size;
        }
        function resetErrors() {
            form.querySelectorAll('[aria-invalid="true"]').forEach(clearField);
            errors.clear(); renderErrors();
            byId('registrationReviewError').hidden = true;
        }
        function announce(message, { review = current?.id === 'previewModal' } = {}) {
            const area = byId(review ? 'registrationReviewError' : 'formMessage');
            area.hidden = false;
            area.replaceChildren();
            const text = doc.createElement('p'); text.textContent = message; area.append(text);
            area.setAttribute('role', 'alert'); area.tabIndex = -1;
            if (review) {
                const link = doc.createElement('a'); link.href = '#firstName'; link.textContent = 'Edit registration details';
                link.addEventListener('click', event => { event.preventDefault(); correctField('firstName'); }); area.append(link);
            }
            focus(area);
        }
        form.addEventListener('input', event => {
            if (errors.has(event.target.id)) { markField(event.target, messageFor(event.target)); renderErrors(); }
        });
        form.addEventListener('change', () => {
            [...errors.keys()].forEach(id => { const control = byId(id); markField(control, messageFor(control)); });
            renderErrors(); schedule();
        });
        form.addEventListener('reset', () => win.setTimeout(resetErrors, 0));
        doc.addEventListener('focusin', schedule);
        doc.addEventListener('pointerdown', () => { pointerHeld = true; }, true);
        doc.addEventListener('pointerup', () => { pointerHeld = false; schedule(); }, true);
        doc.addEventListener('pointercancel', () => { pointerHeld = false; schedule(); }, true);
        doc.addEventListener('focusout', () => { schedule(); win.setTimeout(schedule, 150); });
        win.addEventListener('resize', schedule);
        win.addEventListener('orientationchange', schedule);
        win.visualViewport?.addEventListener('resize', schedule);
        win.visualViewport?.addEventListener('scroll', schedule);
        const resizeObserver = win.ResizeObserver ? new win.ResizeObserver(schedule) : null;
        buttons.forEach(button => resizeObserver?.observe(button));
        refresh();
        return { open, close, focus, validate, announce, resetErrors, refresh: schedule,
            setStage(value) { stage = value; doc.body.dataset.registrationStage = String(value); schedule(); },
            focusDialogStep(id) { win.requestAnimationFrame(() => focus(byId(id)?.querySelector('button,input,a[href]'), false)); },
            activeDialog() { return current?.id || null; }
        };
    }
    return Object.freeze({ create, actionPlacement, createKeyboardTracker, fieldMessage });
});
