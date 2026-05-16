import { PostsSectionProps } from '@/modules/posts/interfaces/posts-section-props.interface';

export interface PostsFeedSectionProps extends PostsSectionProps {
    title: string;
    emptyMessage: string;
}
