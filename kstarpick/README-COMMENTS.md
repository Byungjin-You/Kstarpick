# Comments Functionality

This document provides information about the comments functionality implemented in the K-pop News Portal.

## Overview

The application supports a commenting system that allows users to:
- Post comments on news articles and TV/Film content
- View comments from other users
- Delete their own comments
- Admin users can delete any comment

## API Endpoints

### News Comments

- **GET /api/news/comment**
  - Retrieves comments for a specific news article
  - Query parameters:
    - `id`: ID of the news article (required)
    - `page`: Page number for pagination (default: 1)
    - `limit`: Number of comments per page (default: 10)
  - Requires authentication

- **POST /api/news/comment**
  - Creates a new comment on a news article
  - Request body:
    - `id`: ID of the news article (required)
    - `content`: Comment content (required)
  - Requires authentication

- **DELETE /api/news/comment**
  - Deletes a comment
  - Request body:
    - `commentId`: ID of the comment to delete (required)
  - Only the comment author or an admin can delete a comment
  - Requires authentication

### TV/Film Comments

- **GET /api/tvfilm/comment**
  - Retrieves comments for a specific TV/Film entry
  - Query parameters:
    - `id`: ID of the TV/Film entry (required)
    - `page`: Page number for pagination (default: 1)
    - `limit`: Number of comments per page (default: 10)
  - Requires authentication

- **POST /api/tvfilm/comment**
  - Creates a new comment on a TV/Film entry
  - Request body:
    - `id`: ID of the TV/Film entry (required)
    - `content`: Comment content (required)
  - Requires authentication

- **DELETE /api/tvfilm/comment**
  - Deletes a comment
  - Request body:
    - `commentId`: ID of the comment to delete (required)
  - Only the comment author or an admin can delete a comment
  - Requires authentication

## Data Model

The Comment model includes the following fields:
- `content`: The text content of the comment
- `author`: Reference to the User model who created the comment
- `contentId`: ID of the content being commented on (news article or TV/Film)
- `contentType`: Type of content ('news' or 'tvfilm')
- `createdAt`: Timestamp when the comment was created

## Frontend Implementation

Comments are displayed at the bottom of news article and TV/Film detail pages. The user interface provides:
- A comment form for authenticated users
- List of existing comments with the most recent first
- Author information and timestamp for each comment
- Delete button for comments (visible only to the author or admins)

## Authentication

Users must be signed in to post comments. The comment form will prompt unauthenticated users to sign in.

## Future Enhancements

Planned enhancements to the comments system:
- Reply functionality for nested comments
- Comment editing
- Rich text formatting
- Reactions/emojis
- Reporting inappropriate comments 