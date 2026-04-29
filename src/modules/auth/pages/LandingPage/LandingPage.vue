<script setup lang="ts">
import { useRouter } from 'vue-router';
import { AuthRouteNames } from '@/modules/auth/enums/auth-route-names.enum';
import { uk } from '@/shared/locales/uk';
import BaseButton from '@/shared/components/BaseButton/BaseButton.vue';
import LandingFeatureCard from '@/modules/auth/components/LandingFeatureCard/LandingFeatureCard.vue';
import LandingStatementCard from '@/modules/auth/components/LandingStatementCard/LandingStatementCard.vue';
import logoUrl from '@/shared/assets/icons/eter-logo.svg';
import './LandingPage.css';

const router = useRouter();

const writerFeatures = [
  { icon: 'audio', ...uk.landing.how.writer.record },
  { icon: 'text', ...uk.landing.how.writer.text },
  { icon: 'publish', ...uk.landing.how.writer.publish },
];

const listenerFeatures = [
  { icon: 'search', ...uk.landing.how.listener.author },
  { icon: 'listen-text', ...uk.landing.how.listener.text },
  { icon: 'heart', ...uk.landing.how.listener.react },
];

const audienceFeatures = [
  { icon: 'pen', ...uk.landing.audience.hiddenWriter },
  { icon: 'stage', ...uk.landing.audience.liveReader },
  { icon: 'book', ...uk.landing.audience.listener },
];

const openRegister = (): void => {
  router.push({ name: AuthRouteNames.REGISTER });
};

const openApp = (): void => {
  router.push({ name: AuthRouteNames.HOME });
};
</script>

<template>
  <div class="landing-page">
    <main>
      <section id="top" class="landing-hero" aria-labelledby="landing-title">
        <div class="landing-hero-content">
          <img :src="logoUrl" :alt="uk.common.appName" class="landing-logo" />
          <p class="landing-kicker">{{ uk.landing.hero.kicker }}</p>
          <h1 id="landing-title">{{ uk.landing.hero.title }}</h1>
          <p class="landing-lead">{{ uk.landing.hero.description }}</p>

          <div class="landing-actions">
            <BaseButton
                :label="uk.landing.hero.listen"
                type="button"
                variant="secondary"
                :disabled="false"
                @click="openApp"
            />
            <BaseButton
                :label="uk.landing.hero.publish"
                type="button"
                variant="primary"
                :disabled="false"
                @click="openRegister"
            />
          </div>
        </div>

        <LandingStatementCard
            :title="uk.landing.statement.title"
            :quote="uk.landing.statement.quote"
            :tags="uk.landing.statement.tags"
        />
      </section>

      <section class="landing-section landing-story" aria-labelledby="voice-title">
        <div>
          <p class="landing-section-label">{{ uk.landing.voice.label }}</p>
          <h2 id="voice-title">{{ uk.landing.voice.title }}</h2>
        </div>
        <p>{{ uk.landing.voice.description }}</p>
      </section>

      <section id="how-it-works" class="landing-section landing-how" aria-labelledby="how-title">
        <div>
          <p class="landing-section-label">{{ uk.landing.how.label }}</p>
          <h2 id="how-title">{{ uk.landing.how.title }}</h2>
        </div>
        <div class="landing-workflow">
          <div class="landing-workflow-group">
            <h3>{{ uk.landing.how.writer.title }}</h3>
            <div class="landing-feature-grid">
              <LandingFeatureCard
                  v-for="feature in writerFeatures"
                  :key="feature.title"
                  :icon="feature.icon"
                  :title="feature.title"
                  :description="feature.description"
              />
            </div>
          </div>

          <div class="landing-workflow-group">
            <h3>{{ uk.landing.how.listener.title }}</h3>
            <div class="landing-feature-grid">
              <LandingFeatureCard
                  v-for="feature in listenerFeatures"
                  :key="feature.title"
                  :icon="feature.icon"
                  :title="feature.title"
                  :description="feature.description"
              />
            </div>
          </div>
        </div>
      </section>

      <section class="landing-section landing-section-alt landing-audience" aria-labelledby="audience-title">
        <div>
          <p class="landing-section-label">{{ uk.landing.audience.label }}</p>
          <h2 id="audience-title">{{ uk.landing.audience.title }}</h2>
        </div>
        <div class="landing-feature-grid">
          <LandingFeatureCard
              v-for="feature in audienceFeatures"
              :key="feature.title"
              :icon="feature.icon"
              :title="feature.title"
              :description="feature.description"
          />
        </div>
      </section>

      <section class="landing-cta" aria-labelledby="cta-title">
        <p class="landing-section-label">{{ uk.landing.cta.label }}</p>
        <h2 id="cta-title">{{ uk.landing.cta.title }}</h2>
        <p>{{ uk.landing.cta.description }}</p>
        <div class="landing-actions">
          <BaseButton
              :label="uk.landing.cta.listen"
              type="button"
              variant="secondary"
              :disabled="false"
              @click="openApp"
          />
          <BaseButton
              :label="uk.landing.cta.register"
              type="button"
              variant="primary"
              :disabled="false"
              @click="openRegister"
          />
        </div>
      </section>
    </main>
  </div>
</template>
