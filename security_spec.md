# Security Specification for Page Pilot CMS

## 1. Data Invariants
- An article must have a valid authorId matching the creator's UID.
- Media must have an ownerId matching the creator's UID.
- Notifications are private to the recipient.
- Settings are private to the user.
- Sites and Themes belong to the user who created them.

## 2. The Dirty Dozen Payloads
1. Attempt to create an article with someone else's `authorId`.
2. Attempt to update another user's article.
3. Attempt to set `role: 'admin'` during self-signup.
4. Attempt to read another user's `settings`.
5. Attempt to delete an order if not authorized.
6. Attempt to inject a 1MB string as a category name.
7. Attempt to update `createdAt` (immutable).
8. Attempt to read all notifications (blanket read).
9. Attempt to create a notification for another user without system priveleges.
10. Attempt to update article `views` without using increment (manual set).
11. Attempt to create a media entry with a fake `url`.
12. Attempt to update user profile to change `role`.

## 3. The Test Runner (Mock for validation)
All these should return PERMISSION_DENIED.
