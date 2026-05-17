import { ref } from 'vue';
import { isAxiosError } from 'axios';
import type { ComplaintReasonItem } from '@/modules/profile/interfaces/complaint-reason-item.interface';
import { useProfileStore } from '@/modules/profile/profile.store';
import { uk } from '@/shared/locales/uk';

export function usePostComplaint() {
    const profileStore = useProfileStore();

    const isComplaintDialogOpen = ref(false);
    const complaintPostId = ref<number | null>(null);
    const complaintReasons = ref<ComplaintReasonItem[]>([]);
    const isLoadingComplaintReasons = ref(false);
    const isSubmittingComplaint = ref(false);
    const isComplaintSubmitted = ref(false);
    const complaintErrorMessage = ref('');

    const openComplaintDialog = async (postId: number): Promise<void> => {
        complaintPostId.value = postId;
        isComplaintDialogOpen.value = true;
        isComplaintSubmitted.value = false;
        complaintErrorMessage.value = '';

        if (!complaintReasons.value.length) {
            isLoadingComplaintReasons.value = true;

            try {
                complaintReasons.value = await profileStore.getComplaintReasons();
            } catch {
                complaintErrorMessage.value = uk.common.errors.serverError;
            } finally {
                isLoadingComplaintReasons.value = false;
            }
        }
    };

    const closeComplaintDialog = (): void => {
        isComplaintDialogOpen.value = false;
        complaintPostId.value = null;
    };

    const submitComplaint = async (reason: string): Promise<void> => {
        if (!complaintPostId.value || isSubmittingComplaint.value) {
            return;
        }

        isSubmittingComplaint.value = true;
        complaintErrorMessage.value = '';

        try {
            await profileStore.submitComplaint(complaintPostId.value, reason);
            isComplaintSubmitted.value = true;
        } catch (error) {
            if (isAxiosError(error) && error.response?.status === 409) {
                complaintErrorMessage.value = uk.posts.complaint.alreadyReported;
            } else {
                complaintErrorMessage.value = uk.common.errors.serverError;
            }
        } finally {
            isSubmittingComplaint.value = false;
        }
    };

    return {
        isComplaintDialogOpen,
        complaintPostId,
        complaintReasons,
        isLoadingComplaintReasons,
        isSubmittingComplaint,
        isComplaintSubmitted,
        complaintErrorMessage,
        openComplaintDialog,
        closeComplaintDialog,
        submitComplaint,
    };
}
