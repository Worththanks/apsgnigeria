document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('loginForm');
  if (!form) return;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const submitBtn = form.querySelector('button[type="submit"]');
    const spinner = form.querySelector('.spinner');
    const errorDiv = document.getElementById('errorMessage');

    submitBtn.disabled = true;
    spinner?.classList.remove('hidden');
    errorDiv.innerHTML = '';

    const email = document.getElementById('email').value.trim();
    const password = document.getElementById('password').value;

    try {
      const { error } = await supabaseClient.auth.signInWithPassword({
        email,
        password
      });

      if (error) throw error;

      window.location.href = 'dashboard.html';
    } catch (err) {
      errorDiv.innerHTML = `<div class="alert alert-danger mt-3">${err.message}</div>`;
    } finally {
      submitBtn.disabled = false;
      spinner?.classList.add('hidden');
    }
  });
});
