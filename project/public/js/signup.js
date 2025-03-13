document.getElementById('signUpForm').addEventListener('submit', async function(event) {
    event.preventDefault();

    // Get form values
    const username = document.getElementById('username').value.trim();
    const email = document.getElementById('email').value.trim();
    const password = document.getElementById('password').value;
    const confirmPassword = document.getElementById('confirmPassword').value;
    const role = document.querySelector('input[name="role"]:checked');
    const errorMessage = document.getElementById('errorMessage');
    const submitButton = this.querySelector('button[type="submit"]');

    // Reset error message
    errorMessage.textContent = '';
    errorMessage.style.display = 'none';

    // Validate form fields
    if (!username || !email || !password || !confirmPassword) {
        errorMessage.textContent = 'All fields are required.';
        errorMessage.style.display = 'block';
        return;
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
        errorMessage.textContent = 'Please enter a valid email address.';
        errorMessage.style.display = 'block';
        return;
    }

    // Check if passwords match
    if (password !== confirmPassword) {
        errorMessage.textContent = 'Passwords do not match.';
        return;
    }

    // Check if a role is selected
    if (!role) {
        errorMessage.textContent = 'Please select a role (Landlord or Tenant).';
        return;
    }

    try {
        // Send signup request to server
        const response = await fetch('/signup', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                username,
                email,
                password,
                confirmPassword,
                role: role.value
            })
        });

        if (response.redirected) {
            window.location.href = response.url;
            return;
        }

        const data = await response.json();
        if (!response.ok) {
            errorMessage.textContent = data.error || 'Registration failed. Please try again.';
            return;
        }

        // Clear error messages if everything is valid
        errorMessage.textContent = '';
        window.location.href = '/login';
    } catch (error) {
        console.error('Registration error:', error);
        errorMessage.textContent = 'An error occurred during registration. Please try again.';
    }
});

// Show/Hide Password
const togglePassword = document.getElementById('togglePassword');
const passwordInput = document.getElementById('password');
const toggleConfirmPassword = document.getElementById('toggleConfirmPassword');
const confirmPasswordInput = document.getElementById('confirmPassword');

togglePassword.addEventListener('click', function () {
    const type = passwordInput.getAttribute('type') === 'password' ? 'text' : 'password';
    passwordInput.setAttribute('type', type);
    this.classList.toggle('fa-eye-slash');
});

toggleConfirmPassword.addEventListener('click', function () {
    const type = confirmPasswordInput.getAttribute('type') === 'password' ? 'text' : 'password';
    confirmPasswordInput.setAttribute('type', type);
    this.classList.toggle('fa-eye-slash');
});
