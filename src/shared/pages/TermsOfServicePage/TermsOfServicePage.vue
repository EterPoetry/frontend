<script setup lang="ts">
import LegalPage from '@/shared/pages/LegalPage/LegalPage.vue';
import { uk } from '@/shared/locales/uk';
</script>

<template>
  <LegalPage :title="uk.legal.terms.title" :kicker="uk.legal.kicker">
    <section class="legal-page__section">
      <div class="legal-page__section-heading">
        <span class="legal-page__section-num">01</span>
        <h2 class="legal-page__section-title">Загальні положення</h2>
      </div>
      <div class="legal-page__section-body">
        <p>Ці Умови використання регулюють відносини між Платформою Етер і користувачем. Реєструючись або використовуючи Платформу, ви підтверджуєте що прочитали і погоджуєтесь з цими Умовами.</p>
        <p>Якщо ви не погоджуєтесь з будь-яким пунктом — будь ласка, не використовуйте Платформу.</p>
      </div>
    </section>

    <section class="legal-page__section">
      <div class="legal-page__section-heading">
        <span class="legal-page__section-num">02</span>
        <h2 class="legal-page__section-title">Реєстрація та акаунт</h2>
      </div>
      <div class="legal-page__section-body">
        <p>Для повноцінного використання Платформи необхідна реєстрація. При реєстрації ви зобов'язані надати дійсну адресу електронної пошти. Ім'я або псевдонім може бути будь-яким — ми не вимагаємо використання справжнього імені.</p>
        <p>Ви несете відповідальність за збереження конфіденційності свого пароля і за всі дії що здійснюються з вашого акаунту.</p>
      </div>
    </section>

    <section class="legal-page__section">
      <div class="legal-page__section-heading">
        <span class="legal-page__section-num">03</span>
        <h2 class="legal-page__section-title">Контент користувачів</h2>
      </div>
      <div class="legal-page__section-body">
        <p><strong>Ваші права на контент.</strong> Публікуючи аудіозаписи, тексти або інші матеріали на Платформі, ви зберігаєте всі права на свій контент. Ви надаєте Платформі невиключну безоплатну ліцензію на зберігання, відтворення і відображення вашого контенту в межах роботи Платформи.</p>
        <p><strong>Ваша відповідальність.</strong> Публікуючи контент, ви підтверджуєте що:</p>
        <ul>
          <li>маєте всі необхідні права на його публікацію</li>
          <li>контент не порушує авторських прав третіх осіб</li>
          <li>контент відповідає чинному законодавству України</li>
        </ul>
        <p>Відповідальність за дотримання авторського права та інших прав третіх осіб несе виключно користувач який завантажив контент.</p>
        <p><strong>Заборонений контент.</strong> На Платформі забороняється публікувати:</p>
        <ul>
          <li>матеріали що порушують авторські права без дозволу правовласника</li>
          <li>контент що містить мову ворожнечі, дискримінацію або заклики до насильства</li>
          <li>матеріали пропагандистського характеру на користь держави-агресора</li>
          <li>контент написаний або озвучений російською мовою</li>
          <li>спам, рекламні матеріали та контент не пов'язаний з поезією</li>
          <li>матеріали сексуального характеру</li>
        </ul>
      </div>
    </section>

    <section class="legal-page__section">
      <div class="legal-page__section-heading">
        <span class="legal-page__section-num">04</span>
        <h2 class="legal-page__section-title">Модерація</h2>
      </div>
      <div class="legal-page__section-body">
        <p>Платформа залишає за собою право видаляти контент що порушує ці Умови, без попереднього повідомлення. При систематичних порушеннях акаунт може бути заблокований.</p>
        <p>Будь-який користувач може поскаржитися на контент через відповідну функцію на Платформі. Скарги розглядаються модераторами в розумні терміни.</p>
      </div>
    </section>

    <section class="legal-page__section">
      <div class="legal-page__section-heading">
        <span class="legal-page__section-num">05</span>
        <h2 class="legal-page__section-title">Процедура takedown</h2>
      </div>
      <div class="legal-page__section-body">
        <p>Якщо ви вважаєте що ваші авторські права порушено — надішліть повідомлення на <a href="mailto:support@eter.pp.ua">support@eter.pp.ua</a> з наступною інформацією:</p>
        <ul>
          <li>опис захищеного матеріалу що був порушений</li>
          <li>посилання на матеріал що порушує ваші права</li>
          <li>ваші контактні дані</li>
          <li>підтвердження що ви є правовласником або уповноваженою особою</li>
        </ul>
        <p>Ми розглянемо звернення і вживемо відповідних заходів протягом 48 годин.</p>
        <p>Автор матеріалу щодо якого надійшло повідомлення отримає сповіщення і матиме можливість надати пояснення протягом 72 годин. Якщо пояснення не надано або є недостатнім — матеріал буде видалено.</p>
      </div>
    </section>

    <section class="legal-page__section">
      <div class="legal-page__section-heading">
        <span class="legal-page__section-num">06</span>
        <h2 class="legal-page__section-title">Обмеження відповідальності</h2>
      </div>
      <div class="legal-page__section-body">
        <p>Платформа є некомерційним волонтерським проєктом і надається «як є». Ми не гарантуємо безперебійну роботу Платформи і не несемо відповідальності за будь-які збитки пов'язані з її використанням або недоступністю.</p>
        <p>Платформа не несе відповідальності за контент опублікований користувачами.</p>
      </div>
    </section>

    <section class="legal-page__section">
      <div class="legal-page__section-heading">
        <span class="legal-page__section-num">07</span>
        <h2 class="legal-page__section-title">Зміни до Умов</h2>
      </div>
      <div class="legal-page__section-body">
        <p>Ми можемо оновлювати ці Умови. Про суттєві зміни ми повідомимо через електронну пошту або через Платформу. Продовження використання Платформи після змін означає вашу згоду з оновленими Умовами.</p>
      </div>
    </section>

    <section class="legal-page__section">
      <div class="legal-page__section-heading">
        <span class="legal-page__section-num">08</span>
        <h2 class="legal-page__section-title">Контакти</h2>
      </div>
      <div class="legal-page__section-body">
        <p>З питань щодо цих Умов звертайтесь: <a href="mailto:support@eter.pp.ua">support@eter.pp.ua</a></p>
      </div>
    </section>
  </LegalPage>
</template>
