// --- CONFIGURATION ---
// These values are linked to your specific project: gmzjhitgblngoaglragk
const SUPABASE_URL = 'https://gmzjhitgblngoaglragk.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdtempoaXRnYmxuZ29hZ2xyYWdrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjY5MjYwMDksImV4cCI6MjA4MjUwMjAwOX0.Fn-bOOVCrFN55WjrFTgY5YsL7ulHKKwai-H1ictLgKA';

// FIX: This must match your bucket name in Supabase exactly
const BUCKET_NAME = 'protected-docs'; 
// FIX: Ensure this matches the file name in your bucket exactly
const PDF_FILENAME = 'About Barclays.pdf'; 

// Initialize Supabase Client with explicit headers for reliability
const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_KEY, {
    global: {
        headers: { 'apikey': SUPABASE_KEY }
    }
});

let isSignUp = false;

/**
 * Toggles the UI between Login and Sign Up modes
 */
function toggleAuth() {
    isSignUp = !isSignUp;
    document.getElementById('auth-title').innerText = isSignUp ? 'Create Account' : 'Login';
    document.getElementById('main-btn').innerText = isSignUp ? 'Sign Up' : 'Login';
    document.getElementById('toggle-btn').innerText = isSignUp ? 'Have an account? Login' : 'Need an account? Sign Up';
}

/**
 * Handles the Login or Sign Up button click
 */
async function handleAuth() {
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    
    if(!email || !password) {
        return alert("Please enter both email and password.");
    }

    if (isSignUp) {
        const { error } = await supabaseClient.auth.signUp({ 
            email, 
            password,
            options: {
                // Ensure this matches your GitHub Pages URL exactly
                emailRedirectTo: 'https://elo613.github.io/MemberPortal/' 
            }
        });
        if (error) alert("Sign Up Error: " + error.message);
        else alert("Verification email sent! Please check your inbox and spam folder.");
    } else {
        const { error } = await supabaseClient.auth.signInWithPassword({ email, password });
        if (error) alert("Login Error: " + error.message);
    }
}

/**
 * Signs the user out and resets the UI
 */
async function signOut() {
    const { error } = await supabaseClient.auth.signOut();
    if (error) console.error("Sign out error:", error.message);
    // Clear any hash tokens (like access_token) from the URL bar
    window.location.hash = ''; 
    refreshUI();
}

/**
 * Triggers the Password Reset flow
 */
async function forgotPassword() {
    const email = document.getElementById('email').value;
    if (!email) return alert("Please enter your email address first.");
    
    const { error } = await supabaseClient.auth.resetPasswordForEmail(email, {
        redirectTo: 'https://elo613.github.io/MemberPortal/'
    });
    
    if (error) alert("Error: " + error.message);
    else alert("Password reset link sent to your email!");
}

/**
 * The main UI controller. Checks auth status and fetches protected data.
 */
async function refreshUI() {
    const loadingEl = document.getElementById('loading');
    const authUiEl = document.getElementById('auth-ui');
    const dashboardEl = document.getElementById('dashboard');
    const userCodeEl = document.getElementById('user-code');
    const pdfLinkEl = document.getElementById('pdf-link');

    if (loadingEl) loadingEl.classList.remove('hidden');

    try {
        // Use getUser() for server-side verification of the session
        const { data: { user } } = await supabaseClient.auth.getUser();

        if (user) {
            authUiEl.classList.add('hidden');
            dashboardEl.classList.remove('hidden');
            
            // 1. Fetch the 14-digit code from the 'profiles' table
            const { data: profile, error: profileError } = await supabaseClient
                .from('profiles')
                .select('unique_code')
                .eq('id', user.id)
                .single();
            
            if (profile) {
                userCodeEl.innerText = profile.unique_code;
            } else {
                userCodeEl.innerText = "Error loading code";
                console.error("Profile Error:", profileError?.message);
            }

            // 2. Generate a temporary Signed URL for the PDF
            const { data: storageData, error: storageError } = await supabaseClient.storage
                .from(BUCKET_NAME)
                .createSignedUrl(PDF_FILENAME, 60);

            if (storageData?.signedUrl) {
                pdfLinkEl.href = storageData.signedUrl;
            } else {
                console.error("Storage Error:", storageError?.message);
                pdfLinkEl.onclick = () => alert("PDF not found or access denied. Check storage policies.");
            }

        } else {
            // User is not logged in
            authUiEl.classList.remove('hidden');
            dashboardEl.classList.add('hidden');
        }
    } catch (err) {
        console.error("Critical UI Refresh Error:", err);
    } finally {
        if (loadingEl) loadingEl.classList.add('hidden');
    }
}

/**
 * Listen for authentication state changes (Logins, Logouts, Token updates)
 */
supabaseClient.auth.onAuthStateChange(async (event, session) => {
    console.log("Supabase Auth Event:", event);
    
    // Handle specific events like Password Recovery
    if (event === "PASSWORD_RECOVERY") {
        const newPassword = prompt("Enter your new password:");
        if (newPassword) {
            const { error } = await supabaseClient.auth.updateUser({ password: newPassword });
            if (error) alert("Error updating password: " + error.message);
            else alert("Password updated successfully!");
        }
    }

    // Refresh the UI to reflect the new state
    refreshUI();
});

// Initial run on page load
refreshUI();
