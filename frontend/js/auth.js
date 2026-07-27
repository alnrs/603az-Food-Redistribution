"use strict";

/*
 * ShareBite authentication
 * Amazon Cognito User Pool authentication for:
 * - Registration
 * - Email confirmation
 * - Login
 * - Logout
 * - Authentication token retrieval
 */

(function () {
    const config = window.SHAREBITE_CONFIG;

    if (!config) {
        console.error("SHAREBITE_CONFIG is missing. Check js/config.js.");
        return;
    }

    if (
        typeof AmazonCognitoIdentity === "undefined" ||
        !AmazonCognitoIdentity.CognitoUserPool
    ) {
        console.error(
            "Amazon Cognito JavaScript SDK is not loaded. Check the script tags in the HTML page."
        );
        return;
    }

    const poolData = {
        UserPoolId: config.userPoolId,
        ClientId: config.userPoolClientId
    };

    const userPool = new AmazonCognitoIdentity.CognitoUserPool(poolData);

    /*
     * Safely reads an input value.
     * This prevents the previous:
     * Cannot read properties of undefined (reading 'trim')
     */
    function getInputValue(id) {
        const element = document.getElementById(id);

        if (!element || typeof element.value !== "string") {
            return "";
        }

        return element.value.trim();
    }

    function findElement(...ids) {
        for (const id of ids) {
            const element = document.getElementById(id);

            if (element) {
                return element;
            }
        }

        return null;
    }

    function displayMessage(message, type = "error") {
        const messageBox = findElement(
            "authMessage",
            "message",
            "formMessage",
            "errorMessage",
            "registerMessage",
            "loginMessage",
            "confirmationMessage"
        );

        if (!messageBox) {
            if (type === "error") {
                console.error(message);
            } else {
                console.log(message);
            }

            return;
        }

        messageBox.textContent = message;
        messageBox.style.display = "block";

        messageBox.classList.remove(
            "error",
            "success",
            "alert-error",
            "alert-success"
        );

        if (type === "success") {
            messageBox.classList.add("success", "alert-success");
        } else {
            messageBox.classList.add("error", "alert-error");
        }
    }

    function clearMessage() {
        const messageBox = findElement(
            "authMessage",
            "message",
            "formMessage",
            "errorMessage",
            "registerMessage",
            "loginMessage",
            "confirmationMessage"
        );

        if (messageBox) {
            messageBox.textContent = "";
            messageBox.style.display = "none";
        }
    }

    function setButtonLoading(button, loading, loadingText) {
        if (!button) {
            return;
        }

        if (loading) {
            button.dataset.originalText = button.textContent;
            button.textContent = loadingText;
            button.disabled = true;
        } else {
            button.textContent =
                button.dataset.originalText || button.textContent;
            button.disabled = false;
        }
    }

    function getRegistrationForm() {
        return (
            document.getElementById("registerForm") ||
            document.getElementById("registrationForm")
        );
    }

    function getLoginForm() {
        return (
            document.getElementById("loginForm") ||
            document.getElementById("signinForm")
        );
    }

    function getConfirmationForm() {
        return (
            document.getElementById("confirmForm") ||
            document.getElementById("confirmationForm")
        );
    }

    /*
     * REGISTER
     */
    function registerUser(event) {
        event.preventDefault();
        clearMessage();

        const displayName = getInputValue("displayName");
        const email = getInputValue("email").toLowerCase();
        const passwordElement = document.getElementById("password");
        const password = passwordElement ? passwordElement.value : "";
        const privacyConsent =
            document.getElementById("privacyConsent") ||
            document.getElementById("consent");

        const submitButton =
            event.submitter ||
            findElement("registerButton", "createAccountButton");

        if (!displayName) {
            displayMessage("Please enter your display name.");
            return;
        }

        if (!email) {
            displayMessage("Please enter your email address.");
            return;
        }

        if (!password) {
            displayMessage("Please enter a password.");
            return;
        }

        if (password.length < 8) {
            displayMessage("Your password must contain at least 8 characters.");
            return;
        }

        if (privacyConsent && !privacyConsent.checked) {
            displayMessage(
                "You must read and accept the privacy notice before registering."
            );
            return;
        }

        const attributes = [
            new AmazonCognitoIdentity.CognitoUserAttribute({
                Name: "email",
                Value: email
            }),
            new AmazonCognitoIdentity.CognitoUserAttribute({
                Name: "name",
                Value: displayName
            })
        ];

        setButtonLoading(submitButton, true, "Creating account...");

        userPool.signUp(
            email,
            password,
            attributes,
            null,
            function (error, result) {
                setButtonLoading(submitButton, false);

                if (error) {
                    displayMessage(
                        error.message ||
                            "Account registration failed. Please try again."
                    );
                    return;
                }

                sessionStorage.setItem("sharebitePendingEmail", email);

                displayMessage(
                    "Account created. A verification code has been sent to your email.",
                    "success"
                );

                window.setTimeout(function () {
                    window.location.href =
                        "confirm-account.html?email=" +
                        encodeURIComponent(email);
                }, 1200);
            }
        );
    }

    /*
     * CONFIRM EMAIL
     */
    function confirmAccount(event) {
        event.preventDefault();
        clearMessage();

        const email =
            getInputValue("email").toLowerCase() ||
            sessionStorage.getItem("sharebitePendingEmail") ||
            "";

        const code =
            getInputValue("confirmationCode") ||
            getInputValue("code") ||
            getInputValue("verificationCode");

        const submitButton =
            event.submitter ||
            findElement("confirmButton", "verifyAccountButton");

        if (!email) {
            displayMessage("Please enter the email used during registration.");
            return;
        }

        if (!code) {
            displayMessage("Please enter the verification code.");
            return;
        }

        const cognitoUser = new AmazonCognitoIdentity.CognitoUser({
            Username: email,
            Pool: userPool
        });

        setButtonLoading(submitButton, true, "Confirming...");

        cognitoUser.confirmRegistration(
            code,
            true,
            function (error, result) {
                setButtonLoading(submitButton, false);

                if (error) {
                    displayMessage(
                        error.message ||
                            "The verification code could not be confirmed."
                    );
                    return;
                }

                sessionStorage.removeItem("sharebitePendingEmail");

                displayMessage(
                    "Your account has been confirmed. You can now sign in.",
                    "success"
                );

                window.setTimeout(function () {
                    window.location.href = "login.html";
                }, 1200);
            }
        );
    }

    /*
     * RESEND CONFIRMATION CODE
     */
    function resendConfirmationCode(event) {
        if (event) {
            event.preventDefault();
        }

        clearMessage();

        const email =
            getInputValue("email").toLowerCase() ||
            sessionStorage.getItem("sharebitePendingEmail") ||
            "";

        if (!email) {
            displayMessage("Enter your email address first.");
            return;
        }

        const cognitoUser = new AmazonCognitoIdentity.CognitoUser({
            Username: email,
            Pool: userPool
        });

        cognitoUser.resendConfirmationCode(function (error) {
            if (error) {
                displayMessage(
                    error.message ||
                        "The verification code could not be resent."
                );
                return;
            }

            displayMessage(
                "A new verification code has been sent to your email.",
                "success"
            );
        });
    }

    /*
     * LOGIN
     */
    function loginUser(event) {
        event.preventDefault();
        clearMessage();

        const email = getInputValue("email").toLowerCase();
        const passwordElement = document.getElementById("password");
        const password = passwordElement ? passwordElement.value : "";

        const submitButton =
            event.submitter || findElement("loginButton", "signInButton");

        if (!email) {
            displayMessage("Please enter your email address.");
            return;
        }

        if (!password) {
            displayMessage("Please enter your password.");
            return;
        }

        const authenticationDetails =
            new AmazonCognitoIdentity.AuthenticationDetails({
                Username: email,
                Password: password
            });

        const cognitoUser = new AmazonCognitoIdentity.CognitoUser({
            Username: email,
            Pool: userPool
        });

        setButtonLoading(submitButton, true, "Signing in...");

        cognitoUser.authenticateUser(authenticationDetails, {
            onSuccess: function (session) {
                setButtonLoading(submitButton, false);

                localStorage.setItem(
                    "sharebiteIdToken",
                    session.getIdToken().getJwtToken()
                );

                localStorage.setItem(
                    "sharebiteAccessToken",
                    session.getAccessToken().getJwtToken()
                );

                localStorage.setItem("sharebiteUserEmail", email);

                displayMessage("Sign-in successful.", "success");

                window.setTimeout(function () {
                    window.location.href = "dashboard.html";
                }, 700);
            },

            onFailure: function (error) {
                setButtonLoading(submitButton, false);

                if (error.code === "UserNotConfirmedException") {
                    sessionStorage.setItem("sharebitePendingEmail", email);

                    displayMessage(
                        "Your account has not been confirmed. Redirecting to verification."
                    );

                    window.setTimeout(function () {
                        window.location.href =
                            "confirm-account.html?email=" +
                            encodeURIComponent(email);
                    }, 1200);

                    return;
                }

                displayMessage(
                    error.message ||
                        "Sign-in failed. Check your email and password."
                );
            },

            newPasswordRequired: function () {
                setButtonLoading(submitButton, false);

                displayMessage(
                    "A new password is required for this account."
                );
            }
        });
    }

    /*
     * LOGOUT
     */
    function logoutUser(event) {
        if (event) {
            event.preventDefault();
        }

        const currentUser = userPool.getCurrentUser();

        if (currentUser) {
            currentUser.signOut();
        }

        localStorage.removeItem("sharebiteIdToken");
        localStorage.removeItem("sharebiteAccessToken");
        localStorage.removeItem("sharebiteUserEmail");

        window.location.href = "login.html";
    }

    /*
     * GET A VALID ID TOKEN
     * api.js can use this function for protected API calls.
     */
    function getIdToken() {
        return new Promise(function (resolve, reject) {
            const currentUser = userPool.getCurrentUser();

            if (!currentUser) {
                reject(new Error("No authenticated user was found."));
                return;
            }

            currentUser.getSession(function (error, session) {
                if (error) {
                    reject(error);
                    return;
                }

                if (!session || !session.isValid()) {
                    reject(new Error("Your login session has expired."));
                    return;
                }

                const token = session.getIdToken().getJwtToken();

                localStorage.setItem("sharebiteIdToken", token);
                resolve(token);
            });
        });
    }

    function isAuthenticated() {
        return new Promise(function (resolve) {
            const currentUser = userPool.getCurrentUser();

            if (!currentUser) {
                resolve(false);
                return;
            }

            currentUser.getSession(function (error, session) {
                resolve(!error && Boolean(session) && session.isValid());
            });
        });
    }

    function requireAuthentication() {
        isAuthenticated().then(function (authenticated) {
            if (!authenticated) {
                window.location.href = "login.html";
            }
        });
    }

    function populateConfirmationEmail() {
        const emailInput = document.getElementById("email");

        if (!emailInput) {
            return;
        }

        const parameters = new URLSearchParams(window.location.search);
        const emailFromUrl = parameters.get("email");
        const pendingEmail = sessionStorage.getItem(
            "sharebitePendingEmail"
        );

        if (emailFromUrl) {
            emailInput.value = emailFromUrl;
        } else if (pendingEmail) {
            emailInput.value = pendingEmail;
        }
    }

    function initialiseAuthentication() {
        const registrationForm = getRegistrationForm();
        const loginForm = getLoginForm();
        const confirmationForm = getConfirmationForm();

        if (registrationForm) {
            registrationForm.addEventListener("submit", registerUser);
        }

        if (loginForm) {
            loginForm.addEventListener("submit", loginUser);
        }

        if (confirmationForm) {
            populateConfirmationEmail();
            confirmationForm.addEventListener("submit", confirmAccount);
        }

        const resendButton = findElement(
            "resendCodeButton",
            "resendButton"
        );

        if (resendButton) {
            resendButton.addEventListener(
                "click",
                resendConfirmationCode
            );
        }

        const logoutButtons = document.querySelectorAll(
            "[data-logout], #logoutButton, .logout-button"
        );

        logoutButtons.forEach(function (button) {
            button.addEventListener("click", logoutUser);
        });
    }

    /*
     * Expose functions for other ShareBite JavaScript files.
     */
    window.ShareBiteAuth = {
        userPool: userPool,
        registerUser: registerUser,
        loginUser: loginUser,
        confirmAccount: confirmAccount,
        resendConfirmationCode: resendConfirmationCode,
        logoutUser: logoutUser,
        getIdToken: getIdToken,
        isAuthenticated: isAuthenticated,
        requireAuthentication: requireAuthentication
    };

    document.addEventListener(
        "DOMContentLoaded",
        initialiseAuthentication
    );
})();