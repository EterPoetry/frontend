export interface AdminComplaintTargetPost {
    postId: number;
    slug: string;
    title: string;
    status: string;
    removedAt: string | null;
    postRestorationDeadline: string | null;
}
