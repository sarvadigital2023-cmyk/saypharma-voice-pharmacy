// Central translation catalog for SayPharma.
//
// RUSSIAN IS THE SINGLE SOURCE OF TRUTH. The full text lives in `ru`. The `uk`
// and `en` dictionaries are OVERRIDES that are empty by default — when a key is
// missing there, lookup() falls back to `ru` (see i18n/index.tsx). So editing a
// string in `ru` instantly applies to Ukrainian and English too; no need to
// touch three places. To give a specific phrase a real Ukrainian/English
// translation, add just that key to `uk` / `en`.
//
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
    "home.trust.delivery": "Срочная доставка",
    "home.trust.ai247": "ИИ работает 24/7",

    "transcript.title": "Текст разговора",
    "transcript.live": "В эфире",
    "transcript.idle": "Не в эфире",
    "transcript.empty": "Нажмите «Поговорить с SayPharma» — и здесь появится текст вашего разговора.",
    "transcript.roleAgent": "Оператор",
    "transcript.roleUser": "Вы",
    "transcript.copy": "Скопировать весь разговор",
    "transcript.copied": "Скопировано",

    "home.cta.connecting": "Подключаюсь…",
    "home.caption.connecting": "Соединение с агентом…",
    "voice.notConfigured": "Голосовой агент ещё не подключён.",
    "voice.mic": "Разрешите доступ к микрофону.",
    "voice.failed": "Не удалось начать разговор. Попробуйте ещё раз.",
    "voice.silenceWarning": "Разговор завершается из-за тишины…",

    "gate.subtitle": "Подключение к оператору",
    "gate.cancel": "Отмена",
    "gate.retry": "Повторить",
    "gate.allowGeo": "Разрешить геолокацию",
    "gate.allowMic": "Разрешить микрофон",
    "gate.step.geo": "Местоположение",
    "gate.step.zone": "Зона доставки",
    "gate.step.mic": "Микрофон",
    "gate.step.call": "Соединение",
    "gate.geo.title": "Определяем ваше местоположение",
    "gate.geo.desc": "Это нужно, чтобы проверить, доставляем ли мы в ваш район.",
    "gate.geo.deniedTitle": "Нужен доступ к геолокации",
    "gate.geo.deniedDesc": "Чтобы оформить доставку, разрешите доступ к местоположению и попробуйте снова.",
    "gate.geo.unavailableDesc": "Не удалось определить местоположение. Пожалуйста, попробуйте ещё раз.",
    "gate.zone.title": "Проверяем зону доставки",
    "gate.zone.desc": "Одну секунду…",
    "gate.zone.outTitle": "Вне зоны доставки",
    "gate.zone.outDesc": "К сожалению, вы находитесь вне зоны доставки нашей аптеки.",
    "gate.mic.title": "Доступ к микрофону",
    "gate.mic.desc": "Разрешите доступ к микрофону, чтобы поговорить с оператором.",
    "gate.mic.deniedTitle": "Нужен доступ к микрофону",
    "gate.mic.deniedDesc": "Для разговора с оператором нужен микрофон. Разрешите доступ и попробуйте снова.",
    "gate.call.title": "Соединяем с оператором…",
    "gate.call.desc": "Пожалуйста, подождите.",
    "gate.call.errorTitle": "Не удалось начать разговор",
    "gate.call.errorDesc": "Пожалуйста, попробуйте ещё раз.",
    "gate.contactAddress": "Адрес аптеки: {address}",
    "gate.contactPhone": "Телефон: {phone}",

    "how.title": "От разговора до доставки всего три шага",
    "how.subtitle": "Никаких карточек, фильтров и форм оплаты — всё решается в разговоре.",
    "how.s1.t": "Скажите, что нужно",
    "how.s1.d": "«Нужен парацетамол и витамин D на месяц» — ИИ распознаёт даже сложные запросы.",
    "how.s2.t": "Подтвердите подбор",
    "how.s2.d": "Оператор уточнит дозировку, бренд и сравнит с тем, что уже есть на складе.",
    "how.s3.t": "Получите доставку",
    "how.s3.d": "Курьер привезёт заказ в ближайшее время. Предварительно созвонится с вами. Оплата картой или наличными.",

    "trust.titleA": "Аптечная точность.",
    "trust.titleB": "Скорость разговора.",
    "trust.lead":
      "Работаем только с сертифицированными лекарствами. Рецептурные препараты требуют подтверждения. Разговоры защищены сквозным шифрованием.",
    "trust.i1": "Только лицензированные поставщики",
    "trust.i2": "Защита персональных данных по стандартам ЕС",
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
      "Мы обрабатываем ваши данные в соответствии с GDPR. Разговоры с ИИ-оператором защищены сквозным шифрованием и используются только для оформления вашего заказа.",
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
      "Для получения рецептурных препаратов обратитесь в нашу аптеку к провизору и предъявите рецепт от лечащего врача.",
      "Мы работаем только с безрецептурными средствами, витаминами, БАДами и товарами для здоровья.",
    ],
  },

  uk: {},
  en: {},
};
