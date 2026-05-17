import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { onBeforeRouteLeave } from 'vue-router';
import {
    CATEGORY_SEARCH_DEBOUNCE_MS,
    MAX_POST_CATEGORIES,
} from '@/modules/posts/constants/post-limits.constants';
import { PostsEvents } from '@/modules/posts/enums/posts-events.enum';
import { usePostsStore } from '@/modules/posts/posts.store';
import { PostStatus } from '@/modules/posts/enums/post-status.enum';
import { PostEditorEmits } from '@/modules/posts/interfaces/post-editor-emits.interface';
import { PostCategory } from '@/modules/posts/interfaces/post-category.interface';
import { PostEditorProps } from '@/modules/posts/interfaces/post-editor-props.interface';
import {
    MAX_AUDIO_FILE_SIZE_BYTES,
    SUPPORTED_AUDIO_EXTENSIONS,
} from '@/modules/posts/constants/post-audio.constants';
import { uk } from '@/shared/locales/uk';

export const usePostEditor = (
    props: PostEditorProps,
    emit: PostEditorEmits,
) => {
    const postsStore = usePostsStore();

    const title = ref('');
    const text = ref('');
    const originAuthorName = ref('');
    const description = ref('');
    const categoryQuery = ref('');
    const selectedCategories = ref<PostCategory[]>([]);
    const categoryResults = ref<PostCategory[]>([]);
    const categoryBox = ref<HTMLElement | null>(null);
    const isConsentChecked = ref(true);
    const isSubmitting = ref(false);
    const isReplacingAudio = ref(false);
    const isUploadingAudio = ref(false);
    const isCategoryDropdownOpen = ref(false);
    const errorMessage = ref('');
    const titleError = ref('');
    const textError = ref('');
    const fileInput = ref<HTMLInputElement | null>(null);
    let categorySearchTimer: number | null = null;

    const isProcessing = computed(() => props.post.status === PostStatus.PROCESSING);
    const isDraft = computed(() => props.post.status === PostStatus.DRAFT);
    const isPublished = computed(() => props.post.status === PostStatus.PUBLISHED);
    const isBusy = computed(() => isSubmitting.value || isReplacingAudio.value || isProcessing.value);
    const isCategoryLimitReached = computed(() => selectedCategories.value.length >= MAX_POST_CATEGORIES);
    const isAudioRefreshBusy = computed(() => isUploadingAudio.value || isReplacingAudio.value);
    const audioSource = computed(() => props.post.audioFileUrl || '');
    const isAudioProcessingVisible = computed(() => !audioSource.value && (isUploadingAudio.value || isProcessing.value || isReplacingAudio.value));
    const categorySlotsLabel = computed(() => `${uk.posts.editor.selectedLabel}: ${selectedCategories.value.length} / ${MAX_POST_CATEGORIES}`);
    const audioTitle = computed(() => uk.posts.editor.audioLabel);
    const audioStatusTitle = computed(() => isUploadingAudio.value ? uk.posts.editor.audioUploading : uk.posts.editor.audioPending);
    const audioStatusHint = computed(() => isUploadingAudio.value ? uk.posts.editor.audioUploadingHint : uk.posts.editor.audioPendingHint);
    const submitLabel = computed(() => isPublished.value ? uk.posts.editor.update : uk.posts.editor.publish);
    const savedCategoryIds = computed(() => [...props.post.categories]
        .map((category) => category.categoryId)
        .sort((left, right) => left - right));
    const selectedCategoryIds = computed(() => [...selectedCategories.value]
        .map((category) => category.categoryId)
        .sort((left, right) => left - right));
    const hasUnsavedChanges = computed(() => {
        return title.value !== (props.post.title ?? '')
            || text.value !== (props.post.text ?? '')
            || originAuthorName.value !== (props.post.originAuthorName ?? '')
            || description.value !== (props.post.description ?? '')
            || isConsentChecked.value !== true
            || selectedCategoryIds.value.length !== savedCategoryIds.value.length
            || selectedCategoryIds.value.some((categoryId, index) => categoryId !== savedCategoryIds.value[index]);
    });

    const syncForm = (): void => {
        title.value = props.post.title ?? '';
        text.value = props.post.text ?? '';
        originAuthorName.value = props.post.originAuthorName ?? '';
        description.value = props.post.description ?? '';
        selectedCategories.value = [...props.post.categories];
    };

    const clearValidation = (): void => {
        titleError.value = '';
        textError.value = '';
        errorMessage.value = '';
    };

    const validateReplacementFile = async (file: File): Promise<string | null> => {
        const extension = file.name.split('.').pop()?.toLowerCase() ?? '';

        if (!SUPPORTED_AUDIO_EXTENSIONS.includes(extension)) {
            return uk.posts.modal.errors.unsupportedFormat;
        }

        if (file.size === 0) {
            return uk.posts.modal.errors.emptyFile;
        }

        if (file.size > MAX_AUDIO_FILE_SIZE_BYTES) {
            return uk.posts.modal.errors.fileTooLarge;
        }

        return null;
    };

    const searchCategories = async (): Promise<void> => {
        try {
            const categories = await postsStore.getCategories({
                search: categoryQuery.value.trim() || undefined,
            });

            const selectedIds = new Set(selectedCategories.value.map((category) => category.categoryId));
            categoryResults.value = categories.filter((category) => !selectedIds.has(category.categoryId));
        } catch (_error) {
            categoryResults.value = [];
        }
    };

    const addCategory = (category: PostCategory): void => {
        if (isCategoryLimitReached.value) {
            return;
        }

        if (selectedCategories.value.some((item) => item.categoryId === category.categoryId)) {
            return;
        }

        selectedCategories.value = [...selectedCategories.value, category]
            .sort((left, right) => left.categoryId - right.categoryId);
        categoryQuery.value = '';
        isCategoryDropdownOpen.value = !isCategoryLimitReached.value;
        void searchCategories();
    };

    const removeCategory = (categoryId: number): void => {
        selectedCategories.value = selectedCategories.value.filter((category) => category.categoryId !== categoryId);
        void searchCategories();
    };

    const handleCategoryFocus = (): void => {
        if (isBusy.value || isCategoryLimitReached.value) {
            return;
        }

        if (categorySearchTimer !== null) {
            window.clearTimeout(categorySearchTimer);
            categorySearchTimer = null;
        }

        isCategoryDropdownOpen.value = true;
        void searchCategories();
    };

    const closeCategoryDropdown = (): void => {
        isCategoryDropdownOpen.value = false;
    };

    const handleCategoryRootPointerDown = (): void => {
        if (isBusy.value || isCategoryLimitReached.value) {
            return;
        }

        isCategoryDropdownOpen.value = true;
    };

    const handleDocumentPointerDown = (event: PointerEvent): void => {
        if (!categoryBox.value) {
            return;
        }

        if (event.target instanceof Node && !categoryBox.value.contains(event.target)) {
            closeCategoryDropdown();
        }
    };

    const handleCategoryEscape = (): void => {
        closeCategoryDropdown();
    };

    const openReplaceAudioPicker = (): void => {
        if (!isDraft.value || isBusy.value) {
            return;
        }

        fileInput.value?.click();
    };

    const replaceAudio = async (event: Event): Promise<void> => {
        const target = event.target as HTMLInputElement;
        const file = target.files?.[0];

        if (!file) {
            return;
        }

        const validationError = await validateReplacementFile(file);
        if (validationError) {
            errorMessage.value = validationError;
            target.value = '';
            return;
        }

        isReplacingAudio.value = true;
        isUploadingAudio.value = true;
        errorMessage.value = '';

        try {
            const processingPost = await postsStore.replacePostAudio(props.post.postId, file);
            isUploadingAudio.value = false;
            const nextPost = await postsStore.waitForPostProcessing(processingPost.postId);
            emit(PostsEvents.UPDATED, nextPost);
        } catch (error) {
            isUploadingAudio.value = false;
            errorMessage.value = uk.posts.editor.errors.audioReplaceFailed;
        } finally {
            isReplacingAudio.value = false;
            isUploadingAudio.value = false;
            target.value = '';
        }
    };

    const submit = async (): Promise<void> => {
        clearValidation();

        if (!title.value.trim()) {
            titleError.value = uk.posts.editor.errors.titleRequired;
        }

        if (!text.value.trim()) {
            textError.value = uk.posts.editor.errors.textRequired;
        }

        if (titleError.value || textError.value) {
            return;
        }

        if (!isConsentChecked.value) {
            errorMessage.value = uk.posts.editor.errors.confirmRights;
            return;
        }

        isSubmitting.value = true;

        try {
            const nextPost = await postsStore.updatePost(props.post.postId, {
                title: title.value.trim(),
                text: text.value.trim(),
                description: description.value.trim() || undefined,
                originAuthorName: originAuthorName.value.trim() || undefined,
                categoryIds: selectedCategories.value.map((category) => category.categoryId),
            });

            emit(PostsEvents.UPDATED, nextPost);
        } catch (error) {
            errorMessage.value = uk.posts.editor.errors.publishFailed;
        } finally {
            isSubmitting.value = false;
        }
    };

    const handleBeforeUnload = (event: BeforeUnloadEvent): void => {
        if (!hasUnsavedChanges.value) {
            return;
        }

        event.preventDefault();
        event.returnValue = '';
    };

    watch(() => props.post, () => {
        syncForm();
    }, { immediate: true });

    watch(title, () => {
        if (titleError.value) {
            titleError.value = '';
        }
    });

    watch(text, () => {
        if (textError.value) {
            textError.value = '';
        }
    });

    watch(isConsentChecked, (isChecked) => {
        if (isChecked && errorMessage.value === uk.posts.editor.errors.confirmRights) {
            errorMessage.value = '';
        }
    });

    watch(categoryQuery, () => {
        if (isBusy.value || isCategoryLimitReached.value) {
            return;
        }

        if (categorySearchTimer !== null) {
            window.clearTimeout(categorySearchTimer);
        }

        isCategoryDropdownOpen.value = true;
        categorySearchTimer = window.setTimeout(() => {
            void searchCategories();
        }, CATEGORY_SEARCH_DEBOUNCE_MS);
    });

    watch(() => selectedCategories.value.length, (count) => {
        if (count >= MAX_POST_CATEGORIES) {
            closeCategoryDropdown();
        }
    });

    watch(hasUnsavedChanges, (isDirty) => {
        if (isDirty) {
            window.addEventListener('beforeunload', handleBeforeUnload);
            return;
        }

        window.removeEventListener('beforeunload', handleBeforeUnload);
    }, { immediate: true });

    onBeforeRouteLeave(() => {
        if (!hasUnsavedChanges.value) {
            return true;
        }

        return window.confirm(uk.posts.editor.leaveConfirm);
    });

    onMounted(() => {
        document.addEventListener('pointerdown', handleDocumentPointerDown);
    });

    onBeforeUnmount(() => {
        document.removeEventListener('pointerdown', handleDocumentPointerDown);
        window.removeEventListener('beforeunload', handleBeforeUnload);

        if (categorySearchTimer !== null) {
            window.clearTimeout(categorySearchTimer);
        }
    });

    return {
        addCategory,
        audioSource,
        audioStatusHint,
        audioStatusTitle,
        audioTitle,
        categoryBox,
        categoryQuery,
        categoryResults,
        categorySlotsLabel,
        description,
        errorMessage,
        fileInput,
        handleCategoryEscape,
        handleCategoryFocus,
        handleCategoryRootPointerDown,
        isAudioProcessingVisible,
        isAudioRefreshBusy,
        isBusy,
        isCategoryDropdownOpen,
        isCategoryLimitReached,
        isConsentChecked,
        isDraft,
        isUploadingAudio,
        openReplaceAudioPicker,
        originAuthorName,
        removeCategory,
        replaceAudio,
        selectedCategories,
        submit,
        submitLabel,
        text,
        textError,
        title,
        titleError,
    };
};
