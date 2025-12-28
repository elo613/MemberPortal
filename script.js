// --- CONFIGURATION ---
const SUPABASE_URL = 'https://gmzjhitgblngoaglragk.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdtempoaXRnYmxuZ29hZ2xyYWdrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjY5MjYwMDksImV4cCI6MjA4MjUwMjAwOX0.Fn-bOOVCrFN55WjrFTgY5YsL7ulHKKwai-H1ictLgKA';
const BUCKET_NAME = 'PRIVATE_BUCKET'; // Updated to match your Supabase screenshot
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
        const { error } = await supabaseClient.auth.signUp({ 
            email, 
            password,
            options: {
                // Ensures the email link points to your specific folder
                emailRedirectTo: 'https://elo613.github.io/MemberPortal/' 
            }
        });
        if (error) alert(error.message);
        else alert("Success! Check your email for a confirmation link.");
    } else {
        const { error } = await supabaseClient.auth.signInWithPassword({ email, password });
        if (error) alert(error.message);
    }
}

async function signOut() {
    await supabaseClient.auth.signOut();
    window.location.hash = ''; // Clear tokens from URL on logout
}

// --- UI & DATA LOGIC ---
async function refreshUI() {
    const loadingEl = document.getElementById('loading');
    if (loadingEl) loadingEl.classList.remove('hidden');

    // getUser() is more secure than getSession() for UI state
    const { data: { user } } = await supabaseClient.auth.getUser();

    if (user) {
        document.getElementById('auth-ui').classList.add('hidden');
        document.getElementById('dashboard').classList.remove('hidden');
        
        // 1. Fetch Unique Code from 'profiles' table
        const { data: profile, error: profileError } = await supabaseClient
            .from('profiles')
            .select('unique_code')
            .eq('id', user.id)
            .single();
        
        if (profile) {
            document.getElementById('user-code').innerText = profile.unique_code;
        } else if (profileError) {
            console.error("Profile fetch error:", profileError.message);
        }

        // 2. Generate Signed URL for the PDF
        const { data: storageData, error: storageError } = await supabaseClient.storage
            .from(BUCKET_NAME)
            .createSignedUrl(PDF_FILENAME, 60);

        if (storageData?.signedUrl) {
            document.getElementById('pdf-link').href = storageData.signedUrl;
        } else if (storageError) {
            console.error("Storage error:", storageError.message);
            // This usually means the Policy is missing or filename is wrong
        }
    } else {
        document.getElementById('auth-ui').classList.remove('hidden');
        document.getElementById('dashboard').classList.add('hidden');
    }
    
    if (loadingEl) loadingEl.classList.add('hidden');
}

// --- INITIALIZATION & EVENT LISTENERS ---

// Listen for Auth changes (Login, Logout, Email Confirmation)
supabaseClient.auth.onAuthStateChange(async (event, session) => {
    console.log("Auth Event:", event);
    
    if (event === "SIGNED_IN" || event === "INITIAL_SESSION") {
        // Clean the URL hash if it contains tokens
        if (window.location.hash.includes('access_token')) {
            window.history.replaceState(null, null, window.location.pathname);
        }
    }
    
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

// Check for session immediately on page load
refreshUI();
