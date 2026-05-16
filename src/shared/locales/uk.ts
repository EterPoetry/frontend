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
            username: 'Ім’я користувача',
            logout: 'Вийти',
        },
        errors: {
            serverError: 'Сталася помилка. Перевірте ваше з’єднання або спробуйте пізніше.',
            emptyFields: 'Будь ласка, заповніть всі поля',
            invalidEmail: 'Введіть коректну email адресу',
            usernameTooShort: (min: number) => `Ім’я користувача має містити мінімум ${min} символи`,
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
                email: 'Введіть вашу email адресу',
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
                username: 'Придумайте ім’я користувача',
                email: 'Введіть вашу email адресу',
                password: 'Введіть ваш пароль',
                passwordConfirm: 'Повторіть ваш пароль'
            },
            errors: {
                passwordsDoNotMatch: 'Паролі не збігаються',
                credentialsAlreadyRegistered: 'Користувач з такою поштою або ім’ям користувача вже зареєстрований',
                emailAlreadyRegistered: 'Ця email адреса вже зареєстрована',
                usernameAlreadyTaken: 'Це ім’я користувача вже зайняте'
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
                email: 'Введіть вашу email адресу',
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
    landing: {
        hero: {
            kicker: 'Українська аудіопоезія',
            title: 'Поезія, яку чути',
            description: 'Етер – це місце, де вірші звучать голосом. Записуйте своє, слухайте чуже, читайте текст разом із аудіо.',
            listen: 'Почати слухати',
            publish: 'Почати публікувати',
        },
        statement: {
            title: 'Чому голос?',
            quote: 'Поезія звучить інакше, коли її читає жива людина',
            tags: 'ГОЛОС · СЛОВА',
        },
        voice: {
            label: 'Сенс',
            title: 'Чому голос?',
            description: 'Вірш звучить інакше, коли його читає жива людина. Інтонація, паузи, наголоси змінюють сенс. Просто текст цього не передає, а відео відволікає картинкою. Етер залишає тільки голос і слова.',
        },
        how: {
            label: 'Як це працює',
            title: 'Як це працює',
            writer: {
                title: 'Якщо ви пишете',
                record: {
                    title: 'Запишіть вірш',
                    description: 'Прямо в браузері або завантажте готовий аудіофайл.',
                },
                text: {
                    title: 'Додайте текст',
                    description: 'Слухачі зможуть стежити за рядками під час відтворення.',
                },
                publish: {
                    title: 'Опублікуйте',
                    description: 'Власний вірш або начитування класики – без різниці.',
                },
            },
            listener: {
                title: 'Якщо ви слухаєте',
                author: {
                    title: 'Знайдіть автора',
                    description: 'Підпишіться на тих, хто вам подобається.',
                },
                text: {
                    title: 'Слухайте з текстом',
                    description: 'Стежте за рядками, поки звучить голос.',
                },
                react: {
                    title: 'Реагуйте',
                    description: 'Лайкайте, коментуйте, діліться записами.',
                },
            },
        },
        audience: {
            label: 'Для кого',
            title: 'Для кого Етер',
            hiddenWriter: {
                title: 'Ви пишете вірші, але нікому не показуєте',
                description: 'Етер – місце, де можна почати ділитися своїм голосом. Просто запишіть і опублікуйте.',
            },
            liveReader: {
                title: 'Ви читаєте свої вірші іншим',
                description: 'Тут ваші вірші залишаться після виступу. Люди зможуть повертатися до них, коли захочуть.',
            },
            listener: {
                title: 'Ви любите поезію, але не знаєте, де слухати',
                description: 'Етер збирає авторів і начитування класики в одному місці голосом живих людей.',
            },
        },
        cta: {
            label: 'Почати',
            title: 'Готові спробувати?',
            description: 'Слухайте українську поезію голосом або діліться своєю. Реєстрація безкоштовна.',
            listen: 'Слухати',
            register: 'Зареєструватися',
        },
    },
    home: {
        title: 'Головна',
        searchPlaceholder: 'Пошук',
        gridViewLabel: 'Перемкнути вигляд',
        themeLabel: 'Перемкнути тему',
        subscribeLabel: 'Оформити підписку',
        notificationsLabel: 'Сповіщення',
        profileLabel: 'Ваш профіль',
        publishedReady: 'Аудіо оброблено. Пост уже готовий до публікації.',
        nav: {
            ariaLabel: 'Головна навігація',
            home: 'Головна',
            subscriptions: 'Підписки',
            favorites: 'Улюблені',
            profile: 'Профіль',
            create: 'Створити',
        },
        actions: {
            register: 'Зареєструватися',
            login: 'Увійти',
        },
        sort: {
            ariaLabel: 'Сортування',
            latest: 'Найновіші',
            popular: 'Популярні',
        },
        popularFeed: {
            title: 'Популярні',
            empty: 'Поки що немає популярних постів.',
            loading: 'Завантажуємо популярні публікації...',
            loadingMore: 'Підвантажуємо ще...',
            retry: 'Спробувати ще раз',
            authRequired: 'Увійдіть, щоб бачити популярні публікації.',
            loadFailed: 'Не вдалося завантажити популярні пости. Спробуйте ще раз.',
            originalAuthor: 'Автор оригіналу',
            listens: 'Прослуховування',
            likes: 'Вподобання',
            comments: 'Коментарі',
            play: 'Позначити як активний пост',
        }
    },
    posts: {
        audio: {
            play: 'Відтворити аудіо',
            pause: 'Поставити аудіо на паузу',
            remove: 'Видалити аудіо',
        },
        player: {
            nowPlaying: 'Зараз звучить',
            untitled: 'Без назви',
            mute: 'Вимкнути звук',
            unmute: 'Увімкнути звук',
            volume: 'Гучність',
            seek: 'Перемотати аудіо',
            close: 'Закрити плеєр',
        },
        modal: {
            title: 'Завантажте або запишіть аудіо',
            limitPrefix: 'Максимум',
            limitSuffix: 'на безкоштовному тарифі',
            minutesSuffix: 'хвилин',
            recordingPrefix: 'Запис',
            processing: 'Аудіо завантажено. Обробляємо файл перед відкриттям редактора.',
            tabs: {
                record: 'Записати',
                upload: 'Завантажити файл',
            },
            uploadPrefix: 'Перетягніть файл або',
            uploadLink: 'оберіть з пристрою',
            removeConfirm: {
                title: 'Видалити запис?',
                text: 'Запис буде видалено. Завантажені файли видаляються без підтвердження.',
                confirm: 'Видалити',
            },
            actions: {
                startRecording: 'Розпочати запис',
                stopRecording: 'Зупинити запис',
                continue: 'Далі',
            },
            errors: {
                selectAudio: 'Додайте аудіо, щоб продовжити.',
                unsupportedFormat: 'Підтримуються лише mp3, wav, m4a, aac, ogg, opus та flac.',
                emptyFile: 'Файл порожній. Оберіть інший аудіозапис.',
                fileTooLarge: 'Файл перевищує максимальний розмір 80 MB.',
                durationExceeded: (minutes: number) => `Тривалість аудіо перевищує ${minutes} хвилин.`,
                recordingUnavailable: 'Ваш браузер не підтримує запис аудіо.',
                recordingUnsupported: 'Запис у цьому браузері зараз недоступний. Спробуйте завантажити готовий аудіофайл.',
                microphoneDenied: 'Не вдалося отримати доступ до мікрофона. Перевірте дозвіл у браузері й спробуйте ще раз.',
                createFailed: 'Не вдалося створити пост. Спробуйте ще раз.',
            }
        },
        editor: {
            title: 'Деталі публікації',
            subtitle: 'Розкажіть про вірш',
            publish: 'Опублікувати',
            update: 'Оновити',
            replaceAudio: 'Замінити аудіо',
            audioLabel: 'Аудіо',
            audioPending: 'Аудіо ще обробляється.',
            audioPendingHint: 'Щойно обробка завершиться, плеєр автоматично з’явиться тут.',
            audioPendingBadge: 'Обробка',
            audioUploading: 'Завантажуємо новий файл',
            audioUploadingHint: 'Оновлюємо запис і готуємо його до подальшої обробки.',
            audioUploadingBadge: 'Завантаження',
            selectedLabel: 'Обрано',
            confirmation: 'Я підтверджую, що маю право на публікацію цього запису та несу відповідальність за дотримання авторського права',
            fields: {
                title: 'Назва вірша',
                text: 'Текст вірша',
                textHint: 'необов’язково, але рекомендовано',
                originAuthor: 'Автор вірша',
                originAuthorHint: 'якщо вірш не ваш',
                description: 'Опис вірша',
                descriptionHint: 'необов’язково',
                categories: 'Категорії',
            },
            placeholders: {
                title: 'Введіть назву вірша...',
                text: 'Введіть текст вірша...',
                originAuthor: 'Введіть автора вірша...',
                description: 'Введіть опис вірша...',
                categorySearch: 'Пошук категорії',
            },
            errors: {
                titleRequired: 'Додайте назву вірша.',
                textRequired: 'Додайте текст вірша, щоб опублікувати запис.',
                confirmRights: 'Підтвердіть право на публікацію цього запису.',
                publishFailed: 'Не вдалося оновити пост. Спробуйте ще раз.',
                audioReplaceFailed: 'Не вдалося замінити аудіо. Спробуйте ще раз.',
            },
            leaveConfirm: 'У вас є незбережені зміни. Ви точно хочете покинути сторінку?'
        },
        details: {
            title: 'Пост',
            untitled: 'Без назви',
            follow: 'Стежити',
            unfollow: 'Відписатися',
            edit: 'Редагувати',
            delete: 'Видалити',
            manageSynchronization: 'Керувати синхронізацією',
            textTitle: 'Текст',
            noText: 'Текст для цього поста ще не додано.',
            noDescription: 'Опис поки відсутній.',
            commentsTitle: 'Коментарі',
            commentsSortNewest: 'Нові',
            commentsSortPopular: 'Популярні',
            commentsEmpty: 'Поки що немає коментарів. Будьте першим.',
            commentsClosed: 'Коментарі будуть доступні після публікації поста.',
            commentsLoadFailed: 'Не вдалося завантажити коментарі.',
            commentPlaceholder: 'Залишити коментар',
            replyPlaceholder: 'Написати відповідь',
            reply: 'Відповісти',
            likedByAuthor: 'Лайк автора',
            send: 'Надіслати',
            sending: 'Надсилаємо...',
            showReplies: (count: number) => `${count} ${count === 1 ? 'відповідь' : count < 5 ? 'відповіді' : 'відповідей'}`,
            hideReplies: 'Сховати відповіді',
            deleteComment: 'Видалити',
            deleteCommentTitle: 'Видалити коментар?',
            deleteCommentMessage: 'Коментар буде видалено без можливості відновлення.',
            loadMoreReplies: 'Ще відповіді',
            loginToComment: 'Увійдіть, щоб коментувати',
            profileLoadFailed: 'Не вдалося завантажити профіль автора.',
            followActionFailed: 'Не вдалося оновити підписку. Спробуйте ще раз.',
            deletePostTitle: 'Видалити пост?',
            deletePostMessage: 'Пост буде видалено без можливості відновлення.',
            playFromLine: 'Перейти до цього рядка',
        }
    }
};
