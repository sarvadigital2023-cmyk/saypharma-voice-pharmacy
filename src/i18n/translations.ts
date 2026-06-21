// Central translation catalog for SayPharma.
// Add a key here and it's instantly available via useI18n().t("key").
// The brand name "SayPharma" and the call-center artwork text are intentionally
// NOT translated.

export const LOCALES = ["ru", "uk", "en"] as const;
export type Locale = (typeof LOCALES)[number];

export const LOCALE_NAMES: Record<Locale, { label: string; sub: string }> = {
  ru: { label: "Русский", sub: "Russian" },
  uk: { label: "Українська", sub: "Ukrainian" },
  en: { label: "English", sub: "English" },
};

type Messages = Record<string, string | string[]>;

export const messages: Record<Locale, Messages> = {
  ru: {
    "common.close": "Закрыть",

    "live.idle": "Нажмите кнопку, чтобы начать разговор…",
    "live.stages": [
      "Распознаю речь…",
      "Анализирую запрос…",
      "Проверяю наличие на складе…",
      "Нашёл подходящий товар…",
      "Сверяю с рецептом…",
      "Рассчитываю доставку…",
      "Оформляю заказ…",
      "Готово. Подтвердите голосом.",
    ],

    "nav.how": "Как это работает",
    "nav.security": "Безопасность",
    "nav.contacts": "Контакты",
    "nav.signIn": "Войти",
    "nav.settings": "Настройки",

    "home.badge": "Голосовая аптека · SayPharma",
    "home.cta.start": "Поговорить с SayPharma",
    "home.cta.stop": "Завершить разговор",
    "home.caption.talking": "Идёт разговор · слушаю вас",
    "home.caption.idle": "Бесплатно · без регистрации",
    "home.h1a": "Закажите лекарство",
    "home.h1b": "одним разговором.",
    "home.lead":
      "SayPharma — это аптека, где не нужно искать товар вручную. Поговорите с ИИ-оператором голосом — он найдёт препарат, проверит наличие и оформит доставку за минуту.",
    "home.trust.licensed": "Лицензированные поставщики",
    "home.trust.delivery": "Доставка за 60 минут",
    "home.trust.ai247": "ИИ работает 24/7",

    "chat.label": "Чат с агентом",
    "chat.placeholder": "Задайте вопрос…",
    "chat.greeting": "Здравствуйте! Чем могу помочь?",
    "chat.send": "Отправить",

    "home.cta.connecting": "Подключаюсь…",
    "home.caption.connecting": "Соединение с агентом…",
    "voice.notConfigured": "Голосовой агент ещё не подключён.",
    "voice.mic": "Разрешите доступ к микрофону.",
    "voice.failed": "Не удалось начать разговор. Попробуйте ещё раз.",

    "how.title": "Три шага вместо корзины",
    "how.subtitle": "Никаких карточек, фильтров и форм оплаты — всё решается в разговоре.",
    "how.s1.t": "Скажите, что нужно",
    "how.s1.d": "«Нужен парацетамол и витамин D на месяц» — ИИ распознаёт даже сложные запросы.",
    "how.s2.t": "Подтвердите подбор",
    "how.s2.d": "Оператор уточнит дозировку, бренд и сравнит с тем, что уже есть на складе.",
    "how.s3.t": "Получите доставку",
    "how.s3.d": "Курьер привезёт заказ в течение часа. Оплата картой или СБП по голосовой команде.",

    "trust.titleA": "Аптечная точность.",
    "trust.titleB": "Скорость разговора.",
    "trust.lead":
      "Каталог сверяется с реестром РЛС. Рецептурные препараты требуют подтверждения. Разговоры защищены сквозным шифрованием.",
    "trust.i1": "Только лицензированные поставщики",
    "trust.i2": "Соответствие 152-ФЗ о персональных данных",
    "trust.i3": "Проверка взаимодействия препаратов",
    "trust.i4": "Подтверждение каждой рецептурной позиции",

    "footer.rights": "© {year} SayPharma. Все права защищены.",
    "footer.license": "Лицензия",
    "footer.policy": "Политика",

    "settings.back": "Назад",
    "settings.title": "Настройки",
    "settings.section.language": "Язык",
    "settings.section.theme": "Тема",
    "settings.section.info": "Информация",
    "settings.theme.dark": "Тёмная",
    "settings.theme.light": "Светлая",
    "settings.version": "saypharma · v1.0 · бета",

    "settings.info.how.label": "Как работает SayPharma",
    "settings.info.how.body": [
      "SayPharma — это голосовая аптека. Вы говорите, что вам нужно, а ИИ-оператор находит товар, проверяет наличие и оформляет доставку до двери.",
      "Мы продаём только безрецептурные препараты, а также витамины и БАДы; тонометры, глюкометры, термометры; ортопедические товары; медицинские приборы и другие товары для здоровья, не требующие рецепта.",
    ],
    "settings.info.privacy.label": "Политика конфиденциальности",
    "settings.info.privacy.body": [
      "Мы обрабатываем ваши данные в соответствии с 152-ФЗ. Разговоры с ИИ-оператором защищены сквозным шифрованием и используются только для оформления вашего заказа.",
      "Мы не передаём персональные данные третьим лицам, кроме случаев, необходимых для доставки заказа (курьерская служба).",
    ],
    "settings.info.terms.label": "Условия использования",
    "settings.info.terms.body": [
      "Используя SayPharma, вы соглашаетесь оформлять заказы только для личного использования. Сервис предназначен для совершеннолетних.",
      "Перед применением любого препарата ознакомьтесь с инструкцией и при необходимости проконсультируйтесь со специалистом.",
    ],
    "settings.info.warning.label": "Важное предупреждение",
    "settings.info.warning.body": [
      "SayPharma не продаёт рецептурные лекарства.",
      "Для получения рецептурных препаратов обратитесь в обычную аптеку к провизору и предъявите рецепт от лечащего врача.",
      "Мы работаем только с безрецептурными средствами, витаминами, БАДами и товарами для здоровья.",
    ],
  },

  uk: {
    "common.close": "Закрити",

    "live.idle": "Натисніть кнопку, щоб почати розмову…",
    "live.stages": [
      "Розпізнаю мовлення…",
      "Аналізую запит…",
      "Перевіряю наявність на складі…",
      "Знайшов відповідний товар…",
      "Звіряю з рецептом…",
      "Розраховую доставку…",
      "Оформлюю замовлення…",
      "Готово. Підтвердьте голосом.",
    ],

    "nav.how": "Як це працює",
    "nav.security": "Безпека",
    "nav.contacts": "Контакти",
    "nav.signIn": "Увійти",
    "nav.settings": "Налаштування",

    "home.badge": "Голосова аптека · SayPharma",
    "home.cta.start": "Поговорити з SayPharma",
    "home.cta.stop": "Завершити розмову",
    "home.caption.talking": "Триває розмова · слухаю вас",
    "home.caption.idle": "Безкоштовно · без реєстрації",
    "home.h1a": "Замовте ліки",
    "home.h1b": "однією розмовою.",
    "home.lead":
      "SayPharma — це аптека, де не потрібно шукати товар вручну. Поговоріть з ШІ-оператором голосом — він знайде препарат, перевірить наявність і оформить доставку за хвилину.",
    "home.trust.licensed": "Ліцензовані постачальники",
    "home.trust.delivery": "Доставка за 60 хвилин",
    "home.trust.ai247": "ШІ працює 24/7",

    "chat.label": "Чат з агентом",
    "chat.placeholder": "Поставте запитання…",
    "chat.greeting": "Вітаю! Чим можу допомогти?",
    "chat.send": "Надіслати",

    "home.cta.connecting": "Підключаюсь…",
    "home.caption.connecting": "З'єднання з агентом…",
    "voice.notConfigured": "Голосовий агент ще не підключений.",
    "voice.mic": "Дозвольте доступ до мікрофона.",
    "voice.failed": "Не вдалося почати розмову. Спробуйте ще раз.",

    "how.title": "Три кроки замість кошика",
    "how.subtitle": "Жодних карток, фільтрів і форм оплати — усе вирішується в розмові.",
    "how.s1.t": "Скажіть, що потрібно",
    "how.s1.d": "«Потрібен парацетамол і вітамін D на місяць» — ШІ розпізнає навіть складні запити.",
    "how.s2.t": "Підтвердіть підбір",
    "how.s2.d": "Оператор уточнить дозування, бренд і порівняє з тим, що вже є на складі.",
    "how.s3.t": "Отримайте доставку",
    "how.s3.d": "Кур'єр привезе замовлення протягом години. Оплата карткою або через СБП голосовою командою.",

    "trust.titleA": "Аптечна точність.",
    "trust.titleB": "Швидкість розмови.",
    "trust.lead":
      "Каталог звіряється з реєстром лікарських засобів. Рецептурні препарати потребують підтвердження. Розмови захищені наскрізним шифруванням.",
    "trust.i1": "Лише ліцензовані постачальники",
    "trust.i2": "Відповідність законодавству про персональні дані",
    "trust.i3": "Перевірка взаємодії препаратів",
    "trust.i4": "Підтвердження кожної рецептурної позиції",

    "footer.rights": "© {year} SayPharma. Усі права захищені.",
    "footer.license": "Ліцензія",
    "footer.policy": "Політика",

    "settings.back": "Назад",
    "settings.title": "Налаштування",
    "settings.section.language": "Мова",
    "settings.section.theme": "Тема",
    "settings.section.info": "Інформація",
    "settings.theme.dark": "Темна",
    "settings.theme.light": "Світла",
    "settings.version": "saypharma · v1.0 · бета",

    "settings.info.how.label": "Як працює SayPharma",
    "settings.info.how.body": [
      "SayPharma — це голосова аптека. Ви кажете, що вам потрібно, а ШІ-оператор знаходить товар, перевіряє наявність і оформлює доставку до дверей.",
      "Ми продаємо лише безрецептурні препарати, а також вітаміни та БАДи; тонометри, глюкометри, термометри; ортопедичні товари; медичні прилади та інші товари для здоров'я, що не потребують рецепта.",
    ],
    "settings.info.privacy.label": "Політика конфіденційності",
    "settings.info.privacy.body": [
      "Ми обробляємо ваші дані відповідно до законодавства про персональні дані. Розмови з ШІ-оператором захищені наскрізним шифруванням і використовуються лише для оформлення вашого замовлення.",
      "Ми не передаємо персональні дані третім особам, окрім випадків, необхідних для доставки замовлення (кур'єрська служба).",
    ],
    "settings.info.terms.label": "Умови використання",
    "settings.info.terms.body": [
      "Використовуючи SayPharma, ви погоджуєтесь оформлювати замовлення лише для особистого використання. Сервіс призначений для повнолітніх.",
      "Перед застосуванням будь-якого препарату ознайомтеся з інструкцією та за потреби проконсультуйтеся з фахівцем.",
    ],
    "settings.info.warning.label": "Важливе попередження",
    "settings.info.warning.body": [
      "SayPharma не продає рецептурні ліки.",
      "Для отримання рецептурних препаратів зверніться до звичайної аптеки до провізора та пред'явіть рецепт від лікаря.",
      "Ми працюємо лише з безрецептурними засобами, вітамінами, БАДами та товарами для здоров'я.",
    ],
  },

  en: {
    "common.close": "Close",

    "live.idle": "Press the button to start a conversation…",
    "live.stages": [
      "Recognizing speech…",
      "Analyzing request…",
      "Checking stock availability…",
      "Found a matching product…",
      "Verifying prescription…",
      "Calculating delivery…",
      "Placing the order…",
      "Done. Please confirm by voice.",
    ],

    "nav.how": "How it works",
    "nav.security": "Security",
    "nav.contacts": "Contacts",
    "nav.signIn": "Sign in",
    "nav.settings": "Settings",

    "home.badge": "Voice pharmacy · SayPharma",
    "home.cta.start": "Talk to SayPharma",
    "home.cta.stop": "End call",
    "home.caption.talking": "In conversation · listening to you",
    "home.caption.idle": "Free · no sign-up",
    "home.h1a": "Order medicine",
    "home.h1b": "in one conversation.",
    "home.lead":
      "SayPharma is a pharmacy where you don't search for products by hand. Talk to the AI operator by voice — it finds the product, checks stock and arranges delivery in a minute.",
    "home.trust.licensed": "Licensed suppliers",
    "home.trust.delivery": "Delivery in 60 minutes",
    "home.trust.ai247": "AI works 24/7",

    "chat.label": "Chat with agent",
    "chat.placeholder": "Ask the agent…",
    "chat.greeting": "Hi! How can I help you?",
    "chat.send": "Send",

    "home.cta.connecting": "Connecting…",
    "home.caption.connecting": "Connecting to the agent…",
    "voice.notConfigured": "Voice agent is not configured yet.",
    "voice.mic": "Please allow microphone access.",
    "voice.failed": "Couldn't start the call. Please try again.",

    "how.title": "Three steps instead of a cart",
    "how.subtitle": "No cards, filters or payment forms — everything is handled in the conversation.",
    "how.s1.t": "Say what you need",
    "how.s1.d": "“I need paracetamol and vitamin D for a month” — the AI understands even complex requests.",
    "how.s2.t": "Confirm the selection",
    "how.s2.d": "The operator clarifies dosage and brand and compares it with what's already in stock.",
    "how.s3.t": "Get the delivery",
    "how.s3.d": "A courier delivers within an hour. Pay by card or instant transfer with a voice command.",

    "trust.titleA": "Pharmacy precision.",
    "trust.titleB": "Conversation speed.",
    "trust.lead":
      "The catalog is checked against the official drug registry. Prescription drugs require confirmation. Conversations are end-to-end encrypted.",
    "trust.i1": "Only licensed suppliers",
    "trust.i2": "Compliance with personal-data law",
    "trust.i3": "Drug interaction checks",
    "trust.i4": "Confirmation of every prescription item",

    "footer.rights": "© {year} SayPharma. All rights reserved.",
    "footer.license": "License",
    "footer.policy": "Policy",

    "settings.back": "Back",
    "settings.title": "Settings",
    "settings.section.language": "Language",
    "settings.section.theme": "Theme",
    "settings.section.info": "Information",
    "settings.theme.dark": "Dark",
    "settings.theme.light": "Light",
    "settings.version": "saypharma · v1.0 · beta",

    "settings.info.how.label": "How SayPharma works",
    "settings.info.how.body": [
      "SayPharma is a voice pharmacy. You say what you need, and the AI operator finds the product, checks availability and arranges delivery to your door.",
      "We sell only over-the-counter products, as well as vitamins and supplements; blood-pressure monitors, glucometers, thermometers; orthopedic goods; medical devices and other health products that don't require a prescription.",
    ],
    "settings.info.privacy.label": "Privacy policy",
    "settings.info.privacy.body": [
      "We process your data in accordance with personal-data law. Conversations with the AI operator are end-to-end encrypted and used only to fulfill your order.",
      "We do not share personal data with third parties, except where necessary to deliver your order (the courier service).",
    ],
    "settings.info.terms.label": "Terms of use",
    "settings.info.terms.body": [
      "By using SayPharma you agree to place orders for personal use only. The service is intended for adults.",
      "Before using any medicine, read the instructions and consult a specialist if needed.",
    ],
    "settings.info.warning.label": "Important notice",
    "settings.info.warning.body": [
      "SayPharma does not sell prescription medicines.",
      "To obtain prescription drugs, please visit a regular pharmacy and present a prescription from your doctor.",
      "We work only with over-the-counter products, vitamins, supplements and health goods.",
    ],
  },
};
