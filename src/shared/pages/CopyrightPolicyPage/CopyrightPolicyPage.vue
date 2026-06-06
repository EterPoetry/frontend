<script setup lang="ts">
import LegalPage from '@/shared/pages/LegalPage/LegalPage.vue';
import { uk } from '@/shared/locales/uk';
</script>

<template>
  <LegalPage :title="uk.legal.copyright.title" :kicker="uk.legal.kicker">
    <section class="legal-page__section">
      <div class="legal-page__section-heading">
        <span class="legal-page__section-num">01</span>
        <h2 class="legal-page__section-title">Загальні положення</h2>
      </div>
      <div class="legal-page__section-body">
        <p>Платформа Етер поважає права інтелектуальної власності і очікує того самого від своїх користувачів. Ця Політика пояснює правила публікації контенту з точки зору авторського права, права та обов'язки користувачів, а також процедуру розгляду порушень.</p>
      </div>
    </section>

    <section class="legal-page__section">
      <div class="legal-page__section-heading">
        <span class="legal-page__section-num">02</span>
        <h2 class="legal-page__section-title">Що можна публікувати</h2>
      </div>
      <div class="legal-page__section-body">
        <p>На Платформі дозволяється публікувати аудіозаписи у таких випадках:</p>
        <p><strong>Власні вірші.</strong> Ви є автором тексту і запису — публікуйте без обмежень.</p>
        <p><strong>Вірші у суспільному надбанні (public domain).</strong> Твори авторів які померли більше 70 років тому є суспільним надбанням і можуть вільно використовуватись. Наприклад: Леся Українка, Іван Франко, Тарас Шевченко та інші класики.</p>
        <p><strong>Вірші сучасних авторів з дозволу.</strong> Якщо автор надав вам письмовий або публічний дозвіл на начитування і публікацію свого твору — ви можете його опублікувати. Рекомендуємо зберігати підтвердження дозволу.</p>
        <p><strong>Вірші під відкритою ліцензією.</strong> Твори опубліковані під ліцензіями Creative Commons або подібними, за умови дотримання вимог ліцензії (зазначення авторства тощо).</p>
      </div>
    </section>

    <section class="legal-page__section">
      <div class="legal-page__section-heading">
        <span class="legal-page__section-num">03</span>
        <h2 class="legal-page__section-title">Що не можна публікувати</h2>
      </div>
      <div class="legal-page__section-body">
        <p>Забороняється публікувати аудіозаписи творів сучасних авторів без їхнього дозволу. Незнання авторського права не звільняє від відповідальності.</p>
        <p>При публікації вірша не свого авторства обов'язково вказуйте ім'я оригінального автора у відповідному полі форми публікації.</p>
      </div>
    </section>

    <section class="legal-page__section">
      <div class="legal-page__section-heading">
        <span class="legal-page__section-num">04</span>
        <h2 class="legal-page__section-title">Відповідальність користувача</h2>
      </div>
      <div class="legal-page__section-body">
        <p>Натискаючи кнопку «Опублікувати», користувач підтверджує що має всі необхідні права на публікацію запису. Відповідальність за дотримання авторського права несе виключно користувач який завантажив контент.</p>
        <p>Платформа виступає технічним посередником і не несе відповідальності за порушення авторського права з боку користувачів за умови оперативного реагування на звернення правовласників.</p>
      </div>
    </section>

    <section class="legal-page__section">
      <div class="legal-page__section-heading">
        <span class="legal-page__section-num">05</span>
        <h2 class="legal-page__section-title">Процедура повідомлення про порушення (Takedown)</h2>
      </div>
      <div class="legal-page__section-body">
        <p>Якщо ви вважаєте що ваш твір або твір який ви представляєте опубліковано на Платформі без дозволу — надішліть повідомлення на <a href="mailto:support@eter.pp.ua">support@eter.pp.ua</a>.</p>
        <p>У повідомленні вкажіть:</p>
        <ul>
          <li>назву і опис твору права на який порушено</li>
          <li>пряме посилання на матеріал що порушує ваші права</li>
          <li>ваші контактні дані (ім'я, email)</li>
          <li>підтвердження що ви є правовласником або офіційно уповноваженою особою</li>
        </ul>
        <p>Ми розглянемо звернення протягом 48 годин.</p>
      </div>
    </section>

    <section class="legal-page__section">
      <div class="legal-page__section-heading">
        <span class="legal-page__section-num">06</span>
        <h2 class="legal-page__section-title">Процедура заперечення (Counter-notice)</h2>
      </div>
      <div class="legal-page__section-body">
        <p>Якщо ви отримали повідомлення про те що ваш запис оскаржено — ви маєте 72 години щоб надати пояснення. У відповіді вкажіть підставу на якій ви вважаєте що маєте право на публікацію: власне авторство, дозвіл від автора, суспільне надбання або відкрита ліцензія.</p>
        <p>Якщо пояснення не надано або є недостатнім — матеріал буде видалено. Якщо надано — модератор приймає рішення з урахуванням обох сторін.</p>
        <p>Платформа залишає за собою право вимагати підтвердження повноважень особи яка подає скаргу. Свідомо неправдиве повідомлення про порушення авторського права є підставою для блокування акаунту заявника.</p>
      </div>
    </section>

    <section class="legal-page__section">
      <div class="legal-page__section-heading">
        <span class="legal-page__section-num">07</span>
        <h2 class="legal-page__section-title">Повторні порушення</h2>
      </div>
      <div class="legal-page__section-body">
        <p>Акаунти користувачів які систематично порушують авторські права будуть заблоковані незалежно від того чи видалено конкретний матеріал.</p>
      </div>
    </section>

    <section class="legal-page__section">
      <div class="legal-page__section-heading">
        <span class="legal-page__section-num">08</span>
        <h2 class="legal-page__section-title">Контакти</h2>
      </div>
      <div class="legal-page__section-body">
        <p>З питань авторського права звертайтесь: <a href="mailto:support@eter.pp.ua">support@eter.pp.ua</a></p>
      </div>
    </section>
  </LegalPage>
</template>
