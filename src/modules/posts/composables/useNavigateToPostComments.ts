import { useRouter } from 'vue-router';
import { PostRouteNames } from '@/modules/posts/enums/post-route-names.enum';
import { COMMENTS_FOCUS_EVENT, COMMENTS_FOCUS_QUERY_TARGET } from '@/modules/posts/constants/post-comments.constants';

export const useNavigateToPostComments = () => {
    const router = useRouter();

    const navigateToPostComments = (postId: number): void => {
        window.dispatchEvent(new CustomEvent(COMMENTS_FOCUS_EVENT, {
            detail: { postId },
        }));

        void router.push({
            name: PostRouteNames.POST,
            params: { postId },
            query: {
                focus: COMMENTS_FOCUS_QUERY_TARGET,
                focusToken: Date.now().toString(),
            },
            hash: '#comments',
        });
    };

    return { navigateToPostComments };
};
