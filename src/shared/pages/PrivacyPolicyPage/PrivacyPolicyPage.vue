<script setup lang="ts">
import LegalPage from '@/shared/pages/LegalPage/LegalPage.vue';
import { uk } from '@/shared/locales/uk';
</script>

<template>
  <LegalPage :title="uk.legal.privacy.title" :kicker="uk.legal.kicker">
    <section class="legal-page__section">
      <div class="legal-page__section-heading">
        <span class="legal-page__section-num">01</span>
        <h2 class="legal-page__section-title">Загальні положення</h2>
      </div>
      <div class="legal-page__section-body">
        <p>Ця Політика конфіденційності пояснює які персональні дані збирає Платформа Етер, як вони використовуються і зберігаються, та які права має користувач щодо своїх даних.</p>
        <p>Використовуючи Платформу, ви погоджуєтесь з умовами цієї Політики. Якщо ви не погоджуєтесь — будь ласка, не використовуйте Платформу.</p>
      </div>
    </section>

    <section class="legal-page__section">
      <div class="legal-page__section-heading">
        <span class="legal-page__section-num">02</span>
        <h2 class="legal-page__section-title">Які дані ми збираємо</h2>
      </div>
      <div class="legal-page__section-body">
        <p><strong>При реєстрації:</strong></p>
        <ul>
          <li>Адреса електронної пошти</li>
          <li>Ім'я або псевдонім (може бути вигаданим)</li>
          <li>Фото профілю (необов'язково, завантажується за бажанням)</li>
        </ul>
        <p><strong>При використанні Платформи:</strong></p>
        <ul>
          <li>Аудіозаписи та тексти які ви публікуєте</li>
          <li>Дата і час публікацій та дій на Платформі</li>
          <li>Технічні дані: IP-адреса, тип браузера або пристрою, операційна система</li>
        </ul>
        <p><strong>Через аналітичні інструменти:</strong> Платформа використовує Google Analytics для збору знеособленої статистики відвідувань — кількість користувачів, переглянуті сторінки, час на сайті. Ці дані не дозволяють ідентифікувати конкретну особу.</p>
      </div>
    </section>

    <section class="legal-page__section">
      <div class="legal-page__section-heading">
        <span class="legal-page__section-num">03</span>
        <h2 class="legal-page__section-title">Як ми використовуємо ваші дані</h2>
      </div>
      <div class="legal-page__section-body">
        <p>Зібрані дані використовуються виключно для:</p>
        <ul>
          <li>забезпечення роботи акаунту та автентифікації</li>
          <li>відображення вашого профілю та публікацій іншим користувачам</li>
          <li>надсилання сповіщень пов'язаних з вашою активністю на Платформі (нові коментарі, реакції тощо)</li>
          <li>покращення роботи Платформи на основі знеособленої аналітики</li>
        </ul>
        <p>Ми не продаємо, не передаємо і не розкриваємо ваші персональні дані третім особам у комерційних цілях.</p>
      </div>
    </section>

    <section class="legal-page__section">
      <div class="legal-page__section-heading">
        <span class="legal-page__section-num">04</span>
        <h2 class="legal-page__section-title">Cookies</h2>
      </div>
      <div class="legal-page__section-body">
        <p>Платформа використовує файли cookie для:</p>
        <ul>
          <li>підтримання сесії авторизованого користувача</li>
          <li>збору знеособленої аналітики через Google Analytics</li>
        </ul>
        <p>Ви можете вимкнути cookies у налаштуваннях браузера, однак це може вплинути на коректну роботу Платформи.</p>
      </div>
    </section>

    <section class="legal-page__section">
      <div class="legal-page__section-heading">
        <span class="legal-page__section-num">05</span>
        <h2 class="legal-page__section-title">Зберігання даних</h2>
      </div>
      <div class="legal-page__section-body">
        <p>Ваші дані зберігаються на захищених серверах. Ми вживаємо технічних і організаційних заходів для захисту даних від несанкціонованого доступу, втрати або знищення.</p>
        <p>Дані зберігаються протягом усього часу існування вашого акаунту. Після видалення акаунту персональні дані видаляються протягом 30 днів, за винятком даних які ми зобов'язані зберігати за законом.</p>
      </div>
    </section>

    <section class="legal-page__section">
      <div class="legal-page__section-heading">
        <span class="legal-page__section-num">06</span>
        <h2 class="legal-page__section-title">Права користувача</h2>
      </div>
      <div class="legal-page__section-body">
        <p>Ви маєте право:</p>
        <ul>
          <li>отримати доступ до своїх персональних даних</li>
          <li>виправити неточні або застарілі дані</li>
          <li>видалити свій акаунт і пов'язані з ним дані</li>
          <li>відкликати згоду на обробку даних</li>
        </ul>
        <p>Для реалізації будь-якого з цих прав зверніться до нас за адресою зазначеною в розділі «Контакти».</p>
      </div>
    </section>

    <section class="legal-page__section">
      <div class="legal-page__section-heading">
        <span class="legal-page__section-num">07</span>
        <h2 class="legal-page__section-title">Діти</h2>
      </div>
      <div class="legal-page__section-body">
        <p>Платформа не призначена для осіб молодше 13 років. Ми свідомо не збираємо персональні дані дітей. Якщо вам стало відомо що дитина зареєструвалась на Платформі — будь ласка, повідомте нас.</p>
      </div>
    </section>

    <section class="legal-page__section">
      <div class="legal-page__section-heading">
        <span class="legal-page__section-num">08</span>
        <h2 class="legal-page__section-title">Зміни до Політики</h2>
      </div>
      <div class="legal-page__section-body">
        <p>Ми можемо оновлювати цю Політику. Про суттєві зміни ми повідомимо через електронну пошту або через Платформу. Продовження використання Платформи після змін означає вашу згоду з оновленою Політикою.</p>
      </div>
    </section>

    <section class="legal-page__section">
      <div class="legal-page__section-heading">
        <span class="legal-page__section-num">09</span>
        <h2 class="legal-page__section-title">Контакти</h2>
      </div>
      <div class="legal-page__section-body">
        <p>З питань щодо обробки персональних даних звертайтесь: <a href="mailto:support@eter.pp.ua">support@eter.pp.ua</a></p>
      </div>
    </section>
  </LegalPage>
</template>
