function showLogin() {

    // Login form show
    document.getElementById("loginForm").style.display = "block";


    // Signup form hide
    document.getElementById("signupForm").style.display = "none";


    // Login tab active
    document.getElementById("loginTab")
        .classList.add("active");


    // Signup tab inactive
    document.getElementById("signupTab")
        .classList.remove("active");


    // Change page heading
    document.getElementById("pageTitle").innerText =
        "Welcome Back!";


    // Change subtitle
    document.getElementById("pageSubtitle").innerText =
        "Login to continue or create a new account";

}



function showSignup() {

    // Login form hide
    document.getElementById("loginForm").style.display = "none";


    // Signup form show
    document.getElementById("signupForm").style.display = "block";


    // Signup tab active
    document.getElementById("signupTab")
        .classList.add("active");


    // Login tab inactive
    document.getElementById("loginTab")
        .classList.remove("active");


    // Change page heading
    document.getElementById("pageTitle").innerText =
        "Create Your Account";


    // Change subtitle
    document.getElementById("pageSubtitle").innerText =
        "Let's get started with your account";

}