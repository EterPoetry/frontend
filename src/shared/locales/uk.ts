export const uk = {
    common: {
        appName: 'Eter',
        labels: {
            loading: 'Завантаження...',
            google: 'Увійти за допомогою Google',
            separator: 'або',
            cancel: 'Скасувати',
            email: 'Email адреса',
            password: 'Пароль',
            name: "Ім'я",
            logout: 'Вийти',
        },
        errors: {
            serverError: 'Сталася помилка. Перевірте ваше з’єднання або спробуйте пізніше.',
            emptyFields: 'Будь ласка, заповніть всі поля',
            invalidEmail: 'Введіть коректну email адресу',
            passwordTooShort: (min: number) => `Пароль має містити мінімум ${min} символів`,
        }
    },
    auth: {
        login: {
            title: 'Вхід',
            labels: {
                submit: 'Увійти',
                forgotPassword: 'Забули пароль?',
                createAccount: 'Створити акаунт',
            },
            placeholders: {
                email: 'reader@eter.com',
                password: 'Введіть ваш пароль',
            },
            errors: {
                loginError: 'Неправильний логін або пароль',
            }
        },
        register: {
            title: 'Реєстрація',
            labels: {
                passwordConfirm: 'Повторіть пароль',
                submit: 'Зареєструватися',
                alreadyHaveAccount: 'Вже маєте акаунт?',
                login: 'Увійти',
            },
            placeholders: {
                name: 'Ваше ім’я',
                email: 'reader@eter.com',
                password: 'Введіть ваш пароль',
                passwordConfirm: 'Повторіть ваш пароль'
            },
            errors: {
                passwordsDoNotMatch: 'Паролі не збігаються',
                emailAlreadyRegistered: 'Користувач з такою поштою вже зареєстрований'
            }
        },
        forgotPassword: {
            title: 'Скидання паролю',
            labels: {
                title: 'Скидання паролю',
                submit: 'Надіслати інструкції',
                backToLogin: 'Повернутися до входу',
            },
            placeholders: {
                email: 'reader@eter.com',
            },
            info: {
                description: 'Введіть вашу електронну пошту, і ми надішлемо вам інструкції для скидання паролю.',
                resetSent: 'Якщо цей email зареєстровано в нашій системі, ви отримаєте лист із подальшими інструкціями.'
            }
        },
        verification: {
            title: 'Підтвердження пошти',
            labels: {
                title: 'Підтвердження пошти',
                resend: 'Надіслати код',
                timeout: 'Повторний запит через',
                logout: 'Вийти з акаунту',
                submit: 'Підтвердити',
            },
            placeholders: {
                code: 'Код з листа',
            },
            info: {
                main: (email: string) => `Щоб отримати доступ до всіх можливостей, необхідно підтвердити вашу поштову адресу <strong>${email}</strong>.`,
                sent: (email: string) => `Ми надіслали код на <strong>${email}</strong>. Введіть його нижче для активації акаунта.`,
            },
            errors: {
                invalidCode: 'Неправильний код. Спробуйте ще раз.'
            }
        },
        resetPassword: {
            title: 'Новий пароль',
            labels: {
                title: 'Новий пароль',
                submit: 'Змінити',
                successBack: 'До входу',
            },
            placeholders: {
                password: 'Введіть новий пароль',
                passwordConfirm: 'Повторіть новий пароль',
            },
            info: {
                description: 'Будь ласка, введіть новий пароль для вашого акаунта.',
                success: 'Ваш пароль успішно змінено! Тепер ви можете увійти з новим паролем.'
            },
            errors: {
                invalidToken: 'Посилання для скидання пароля застаріло або недійсне.',
                sameAsOld: 'Новий пароль має відрізнятися від старого.',
            }
        },
    },
    home: {
        title: 'Головна',
        welcome: 'Ласкаво просимо до вашого особистого кабінету.'
    }
};