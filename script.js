// --- CONFIGURATION ---
const SUPABASE_URL = 'https://gmzjhitgblngoaglragk.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdtempoaXRnYmxuZ29hZ2xyYWdrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjY5MjYwMDksImV4cCI6MjA4MjUwMjAwOX0.Fn-bOOVCrFN55WjrFTgY5YsL7ulHKKwai-H1ictLgKA';
const PDF_FILENAME = 'About Barclays.pdf'; 

const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

let isSignUp = false;

// --- AUTH LOGIC ---
function toggleAuth() {
    isSignUp = !isSignUp;
    document.getElementById('auth-title').innerText = isSignUp ? 'Create Account' : 'Login';
    document.getElementById('main-btn').innerText = isSignUp ? 'Sign Up' : 'Login';
    document.getElementById('toggle-btn').innerText = isSignUp ? 'Have an account? Login' : 'Need an account? Sign Up';
}

async function handleAuth() {
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    if(!email || !password) return alert("Please fill in all fields");

    if (isSignUp) {
        const { error } = await supabaseClient.auth.signUp({ email, password });
        if (error) alert(error.message);
        else alert("Success! Check your email for a confirmation link.");
    } else {
        const { error } = await supabaseClient.auth.signInWithPassword({ email, password });
        if (error) alert(error.message);
    }
}

async function forgotPassword() {
    const email = document.getElementById('email').value;
    if (!email) return alert("Please enter your email address first.");
    const { error } = await supabaseClient.auth.resetPasswordForEmail(email);
    if (error) alert(error.message);
    else alert("Password reset link sent to your email!");
}

async function signOut() {
    await supabaseClient.auth.signOut();
}

// --- UI & DATA LOGIC ---
async function refreshUI() {
    document.getElementById('loading').classList.remove('hidden');
    const { data: { user } } = await supabaseClient.auth.getUser();

    if (user) {
        document.getElementById('auth-ui').classList.add('hidden');
        document.getElementById('dashboard').classList.remove('hidden');
        
        // 1. Fetch Unique Code
        const { data: profile } = await supabaseClient.from('profiles').select('unique_code').eq('id', user.id).single();
        if (profile) document.getElementById('user-code').innerText = profile.unique_code;

        // 2. Fetch Secure PDF Link (Signed URL)
        const { data: storageData } = await supabaseClient.storage
            .from('protected-docs')
            .createSignedUrl(PDF_FILENAME, 60);

        if (storageData) {
            document.getElementById('pdf-link').href = storageData.signedUrl;
        }
    } else {
        document.getElementById('auth-ui').classList.remove('hidden');
        document.getElementById('dashboard').classList.add('hidden');
    }
    document.getElementById('loading').classList.add('hidden');
}

// Handle password reset redirections and auth state changes
supabaseClient.auth.onAuthStateChange(async (event, session) => {
    if (event === "PASSWORD_RECOVERY") {
        const newPassword = prompt("Please enter your new password:");
        if (newPassword) {
            const { error } = await supabaseClient.auth.updateUser({ password: newPassword });
            if (error) alert("Error: " + error.message);
            else alert("Password updated successfully!");
        }
    }
    refreshUI();
});

// Initial Load
refreshUI();
