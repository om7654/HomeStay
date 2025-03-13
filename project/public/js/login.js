document.getElementById('loginForm').addEventListener('submit', async function(event) {
    event.preventDefault();

    // Get form values
    const username = document.getElementById('username').value.trim();
    const password = document.getElementById('password').value;
    const role = document.querySelector('input[name="role"]:checked');
    const errorMessage = document.getElementById('errorMessage');
    const submitButton = this.querySelector('button[type="submit"]');

    // Reset error message
    errorMessage.textContent = '';
    errorMessage.style.display = 'none';

    // Client-side validation
    if (!username || !password) {
        errorMessage.textContent = 'Please enter both username and password.';
        errorMessage.style.display = 'block';
        return;
    }

    if (!role) {
        errorMessage.textContent = 'Please select a role (Landlord or Tenant).';
        errorMessage.style.display = 'block';
        return;
    }

    // Disable submit button during request
    submitButton.disabled = true;
    submitButton.textContent = 'Logging in...';
    
    // Add loading state to form
    document.body.style.cursor = 'wait';

    try {
        // Send login request to server
        const response = await fetch('/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                username,
                password,
                role: role.value
            })
        });

        if (response.redirected) {
            window.location.href = response.url;
            return;
        }

        const data = await response.json();
        if (!response.ok) {
            errorMessage.textContent = data.error || 'Login failed. Please try again.';
            return;
        }

        // Clear error messages if everything is valid
        errorMessage.textContent = '';
        window.location.href = '/';
    } catch (error) {
        console.error('Login error:', error);
        errorMessage.textContent = 'An error occurred during login. Please try again.';
    }
});

// Show/Hide Password
const togglePassword = document.getElementById('togglePassword');
const passwordInput = document.getElementById('password');

togglePassword.addEventListener('click', function () {
    const type = passwordInput.getAttribute('type') === 'password' ? 'text' : 'password';
    passwordInput.setAttribute('type', type);
    this.classList.toggle('fa-eye-slash');
});

// Google Login Placeholder
document.getElementById('googleLogin').addEventListener('click', function() {
    alert('Redirecting to Google login...');
   
});
