"use strict";

/*
 * ShareBite Cognito Authentication
 * Handles registration, confirmation, login, logout,
 * token retrieval and protected-page authentication.
 */

(function () {
    const config = window.SHAREBITE_CONFIG;

    if (!config) {
        console.error(
            "SHAREBITE_CONFIG is missing. Check that js/config.js loads before js/auth.js."
        );
        return;
    }

    if (
        typeof AmazonCognitoIdentity === "undefined" ||
        !AmazonCognitoIdentity.CognitoUserPool
    ) {
        console.error(
            "Amazon Cognito JavaScript SDK is not loaded."
        );
        return;
    }

    const poolData = {
        UserPoolId: config.userPoolId,
        ClientId: config.userPoolClientId
    };

    const userPool =
        new AmazonCognitoIdentity.CognitoUserPool(poolData);

    /*
     * Read a form value safely.
     * Prevents errors such as:
     * Cannot read properties of undefined (reading 'trim')
     */
    function getInputValue(...ids) {
        for (const id of ids) {
            const element = document.getElementById(id);

            if (
                element &&
                typeof element.value === "string"
            ) {
                return element.value.trim();
            }
        }

        return "";
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

    function getMessageBox() {
        return findElement(
            "authMessage",
            "message",
            "formMessage",
            "errorMessage",
            "registerMessage",
            "loginMessage",
            "confirmationMessage"
        );
    }

    function clearMessage() {
        const messageBox = getMessageBox();

        if (!messageBox) {
            return;
        }

        messageBox.textContent = "";
        messageBox.style.display = "none";

        messageBox.classList.remove(
            "error",
            "success",
            "alert-error",
            "alert-success"
        );
    }

    function displayMessage(message, type = "error") {
        const messageBox = getMessageBox();

        if (!messageBox) {
            if (type === "success") {
                console.log(message);
            } else {
                console.error(message);
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
            messageBox.classList.add(
                "success",
                "alert-success"
            );
        } else {
            messageBox.classList.add(
                "error",
                "alert-error"
            );
        }
    }

    function setButtonLoading(
        button,
        loading,
        loadingText
    ) {
        if (!button) {
            return;
        }

        if (loading) {
            button.dataset.originalText =
                button.textContent;

            button.textContent = loadingText;
            button.disabled = true;
        } else {
            button.textContent =
                button.dataset.originalText ||
                button.textContent;

            button.disabled = false;
        }
    }

    /*
     * REGISTER
     */
    function registerUser(event) {
        if (event) {
            event.preventDefault();
        }

        clearMessage();

        const displayName = getInputValue(
            "displayName",
            "name"
        );

        const email = getInputValue(
            "email",
            "registerEmail"
        ).toLowerCase();

        const passwordElement = findElement(
            "password",
            "registerPassword"
        );

        const password = passwordElement
            ? passwordElement.value
            : "";

        const privacyConsent = findElement(
            "privacyConsent",
            "consent",
            "privacy"
        );

        const submitButton =
            event && event.submitter
                ? event.submitter
                : findElement(
                      "registerButton",
                      "createAccountButton"
                  );

        if (!displayName) {
            displayMessage(
                "Please enter your display name."
            );
            return false;
        }

        if (!email) {
            displayMessage(
                "Please enter your email address."
            );
            return false;
        }

        if (!password) {
            displayMessage(
                "Please enter a password."
            );
            return false;
        }

        if (password.length < 8) {
            displayMessage(
                "Your password must contain at least 8 characters."
            );
            return false;
        }

        if (
            privacyConsent &&
            !privacyConsent.checked
        ) {
            displayMessage(
                "You must accept the privacy notice before creating an account."
            );
            return false;
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

        setButtonLoading(
            submitButton,
            true,
            "Creating account..."
        );

        userPool.signUp(
            email,
            password,
            attributes,
            null,
            function (error) {
                setButtonLoading(
                    submitButton,
                    false
                );

                if (error) {
                    displayMessage(
                        error.message ||
                            "Account registration failed."
                    );
                    return;
                }

                sessionStorage.setItem(
                    "sharebitePendingEmail",
                    email
                );

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

        return false;
    }

    /*
     * CONFIRM ACCOUNT
     */
    function confirmAccount(event) {
        if (event) {
            event.preventDefault();
        }

        clearMessage();

        const email =
            getInputValue(
                "email",
                "confirmationEmail"
            ).toLowerCase() ||
            sessionStorage.getItem(
                "sharebitePendingEmail"
            ) ||
            "";

        const confirmationCode = getInputValue(
            "confirmationCode",
            "verificationCode",
            "code"
        );

        const submitButton =
            event && event.submitter
                ? event.submitter
                : findElement(
                      "confirmButton",
                      "verifyAccountButton"
                  );

        if (!email) {
            displayMessage(
                "Please enter the email address used to register."
            );
            return false;
        }

        if (!confirmationCode) {
            displayMessage(
                "Please enter the verification code."
            );
            return false;
        }

        const cognitoUser =
            new AmazonCognitoIdentity.CognitoUser({
                Username: email,
                Pool: userPool
            });

        setButtonLoading(
            submitButton,
            true,
            "Confirming..."
        );

        cognitoUser.confirmRegistration(
            confirmationCode,
            true,
            function (error) {
                setButtonLoading(
                    submitButton,
                    false
                );

                if (error) {
                    displayMessage(
                        error.message ||
                            "Account confirmation failed."
                    );
                    return;
                }

                sessionStorage.removeItem(
                    "sharebitePendingEmail"
                );

                displayMessage(
                    "Your account has been confirmed. You can now sign in.",
                    "success"
                );

                window.setTimeout(function () {
                    window.location.href =
                        "login.html";
                }, 1200);
            }
        );

        return false;
    }

    /*
     * RESEND VERIFICATION CODE
     */
    function resendConfirmationCode(event) {
        if (event) {
            event.preventDefault();
        }

        clearMessage();

        const email =
            getInputValue(
                "email",
                "confirmationEmail"
            ).toLowerCase() ||
            sessionStorage.getItem(
                "sharebitePendingEmail"
            ) ||
            "";

        if (!email) {
            displayMessage(
                "Please enter your email address."
            );
            return false;
        }

        const cognitoUser =
            new AmazonCognitoIdentity.CognitoUser({
                Username: email,
                Pool: userPool
            });

        cognitoUser.resendConfirmationCode(
            function (error) {
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
            }
        );

        return false;
    }

    /*
     * LOGIN
     */
    function loginUser(event) {
        if (event) {
            event.preventDefault();
        }

        clearMessage();

        const email = getInputValue(
            "email",
            "loginEmail"
        ).toLowerCase();

        const passwordElement = findElement(
            "password",
            "loginPassword"
        );

        const password = passwordElement
            ? passwordElement.value
            : "";

        const submitButton =
            event && event.submitter
                ? event.submitter
                : findElement(
                      "loginButton",
                      "signInButton"
                  );

        if (!email) {
            displayMessage(
                "Please enter your email address."
            );
            return false;
        }

        if (!password) {
            displayMessage(
                "Please enter your password."
            );
            return false;
        }

        const authenticationDetails =
            new AmazonCognitoIdentity.AuthenticationDetails({
                Username: email,
                Password: password
            });

        const cognitoUser =
            new AmazonCognitoIdentity.CognitoUser({
                Username: email,
                Pool: userPool
            });

        setButtonLoading(
            submitButton,
            true,
            "Signing in..."
        );

        cognitoUser.authenticateUser(
            authenticationDetails,
            {
                onSuccess: function (session) {
                    setButtonLoading(
                        submitButton,
                        false
                    );

                    const idToken =
                        session
                            .getIdToken()
                            .getJwtToken();

                    const accessToken =
                        session
                            .getAccessToken()
                            .getJwtToken();

                    localStorage.setItem(
                        "sharebiteIdToken",
                        idToken
                    );

                    localStorage.setItem(
                        "sharebiteAccessToken",
                        accessToken
                    );

                    localStorage.setItem(
                        "sharebiteUserEmail",
                        email
                    );

                    displayMessage(
                        "Sign-in successful.",
                        "success"
                    );

                    window.setTimeout(function () {
                        window.location.href =
                            "dashboard.html";
                    }, 700);
                },

                onFailure: function (error) {
                    setButtonLoading(
                        submitButton,
                        false
                    );

                    if (
                        error.code ===
                        "UserNotConfirmedException"
                    ) {
                        sessionStorage.setItem(
                            "sharebitePendingEmail",
                            email
                        );

                        displayMessage(
                            "Your account is not confirmed. Redirecting to verification."
                        );

                        window.setTimeout(function () {
                            window.location.href =
                                "confirm-account.html?email=" +
                                encodeURIComponent(
                                    email
                                );
                        }, 1200);

                        return;
                    }

                    displayMessage(
                        error.message ||
                            "Sign-in failed. Check your email and password."
                    );
                },

                newPasswordRequired: function () {
                    setButtonLoading(
                        submitButton,
                        false
                    );

                    displayMessage(
                        "A new password is required for this account."
                    );
                }
            }
        );

        return false;
    }

    /*
     * LOGOUT
     */
    function logoutUser(event) {
        if (event) {
            event.preventDefault();
        }

        const currentUser =
            userPool.getCurrentUser();

        if (currentUser) {
            currentUser.signOut();
        }

        localStorage.removeItem(
            "sharebiteIdToken"
        );

        localStorage.removeItem(
            "sharebiteAccessToken"
        );

        localStorage.removeItem(
            "sharebiteUserEmail"
        );

        window.location.href = "login.html";

        return false;
    }

    /*
     * GET VALID ID TOKEN FOR PROTECTED API REQUESTS
     */
    function getIdToken() {
        return new Promise(function (
            resolve,
            reject
        ) {
            const currentUser =
                userPool.getCurrentUser();

            if (!currentUser) {
                reject(
                    new Error(
                        "No authenticated user was found."
                    )
                );
                return;
            }

            currentUser.getSession(function (
                error,
                session
            ) {
                if (error) {
                    reject(error);
                    return;
                }

                if (
                    !session ||
                    !session.isValid()
                ) {
                    reject(
                        new Error(
                            "Your login session has expired."
                        )
                    );
                    return;
                }

                const token =
                    session
                        .getIdToken()
                        .getJwtToken();

                localStorage.setItem(
                    "sharebiteIdToken",
                    token
                );

                resolve(token);
            });
        });
    }

    function isAuthenticated() {
        return new Promise(function (resolve) {
            const currentUser =
                userPool.getCurrentUser();

            if (!currentUser) {
                resolve(false);
                return;
            }

            currentUser.getSession(function (
                error,
                session
            ) {
                resolve(
                    !error &&
                        Boolean(session) &&
                        session.isValid()
                );
            });
        });
    }

    function requireAuthentication() {
        isAuthenticated().then(function (
            authenticated
        ) {
            if (!authenticated) {
                window.location.href =
                    "login.html";
            }
        });
    }

    function populateConfirmationEmail() {
        const emailInput = findElement(
            "email",
            "confirmationEmail"
        );

        if (!emailInput) {
            return;
        }

        const urlParameters =
            new URLSearchParams(
                window.location.search
            );

        const emailFromUrl =
            urlParameters.get("email");

        const pendingEmail =
            sessionStorage.getItem(
                "sharebitePendingEmail"
            );

        if (emailFromUrl) {
            emailInput.value = emailFromUrl;
        } else if (pendingEmail) {
            emailInput.value = pendingEmail;
        }
    }

    /*
     * Add event listeners only when the HTML does not
     * already contain an inline onsubmit handler.
     */
    function initialiseAuthentication() {
        const registrationForm = findElement(
            "registerForm",
            "registrationForm"
        );

        const loginForm = findElement(
            "loginForm",
            "signinForm"
        );

        const confirmationForm = findElement(
            "confirmForm",
            "confirmationForm"
        );

        if (
            registrationForm &&
            !registrationForm.getAttribute(
                "onsubmit"
            )
        ) {
            registrationForm.addEventListener(
                "submit",
                registerUser
            );
        }

        if (
            loginForm &&
            !loginForm.getAttribute("onsubmit")
        ) {
            loginForm.addEventListener(
                "submit",
                loginUser
            );
        }

        if (
            confirmationForm &&
            !confirmationForm.getAttribute(
                "onsubmit"
            )
        ) {
            confirmationForm.addEventListener(
                "submit",
                confirmAccount
            );
        }

        if (confirmationForm) {
            populateConfirmationEmail();
        }

        const resendButton = findElement(
            "resendCodeButton",
            "resendButton"
        );

        if (
            resendButton &&
            !resendButton.getAttribute("onclick")
        ) {
            resendButton.addEventListener(
                "click",
                resendConfirmationCode
            );
        }

        const logoutButtons =
            document.querySelectorAll(
                "[data-logout], #logoutButton, .logout-button"
            );

        logoutButtons.forEach(function (button) {
            if (
                !button.getAttribute("onclick")
            ) {
                button.addEventListener(
                    "click",
                    logoutUser
                );
            }
        });
    }

    /*
     * Functions available to other JavaScript files.
     */
    window.ShareBiteAuth = {
        userPool: userPool,
        registerUser: registerUser,
        loginUser: loginUser,
        confirmAccount: confirmAccount,
        resendConfirmationCode:
            resendConfirmationCode,
        logoutUser: logoutUser,
        getIdToken: getIdToken,
        isAuthenticated: isAuthenticated,
        requireAuthentication:
            requireAuthentication
    };

    /*
     * Compatibility names used directly by the HTML pages.
     * These fix the "register is not defined" error.
     */
    window.register = registerUser;
    window.registerUser = registerUser;

    window.login = loginUser;
    window.loginUser = loginUser;

    window.confirmRegistration =
        confirmAccount;
    window.confirmAccount = confirmAccount;

    window.resendCode =
        resendConfirmationCode;
    window.resendConfirmationCode =
        resendConfirmationCode;

    window.logout = logoutUser;
    window.logoutUser = logoutUser;

    document.addEventListener(
        "DOMContentLoaded",
        initialiseAuthentication
    );
})();