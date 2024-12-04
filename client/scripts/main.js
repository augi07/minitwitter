const API_BASE_URL = 'http://localhost:4200';

// Helper to Check Token Expiry
function isTokenExpired(token) {
  const payload = JSON.parse(atob(token.split('.')[1]));
  return payload.exp * 1000 < Date.now();
}

// Event Listener for DOM Content Loaded
document.addEventListener('DOMContentLoaded', () => {
  const token = localStorage.getItem('token');
  if (!token || isTokenExpired(token)) {
    alert('Session expired. Please log in again.');
    window.location.href = '/login.html';
  } else {
    loadPosts();
  }

  document.getElementById('createPostForm').addEventListener('submit', createPost);
  document.getElementById('logoutButton').addEventListener('click', logout);
});

// Logout Function
function logout() {
  localStorage.removeItem('token');
  window.location.href = '/login.html';
}

// Load Posts
async function loadPosts() {
  const token = localStorage.getItem('token');
  try {
    const response = await fetch(`${API_BASE_URL}/posts`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (response.ok) {
      const posts = await response.json();
      renderPosts(posts);
    } else {
      throw new Error(await response.text());
    }
  } catch (err) {
    console.error('Error loading posts:', err);
    alert('Failed to load posts.');
  }
}

// Create Post
async function createPost(event) {
  event.preventDefault();
  const content = document.getElementById('postContent').value;

  if (!content) {
    //alert('Post content cannot be empty!');
    return;
  }

  const token = localStorage.getItem('token');
  try {
    const response = await fetch(`${API_BASE_URL}/posts`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ content }),
    });

    if (response.ok) {
      document.getElementById('postContent').value = '';
      // Neuladen der Posts nach erfolgreichem Erstellen
      loadPosts();
    } else {
      throw new Error(await response.text());
    }
  } catch (err) {
    console.error('Error creating post:', err);
    alert('Failed to create post.');
  }
}

// Render Posts
function renderPosts(posts) {
  const postsContainer = document.getElementById('postsContainer');
  if (!postsContainer) return;

  postsContainer.innerHTML = posts.map(post => `
    <div class="bg-white p-4 rounded shadow">
      <div class="flex justify-between items-center mb-2">
        <strong>${post.username}</strong>
        <small>${new Date(post.created_at).toLocaleString()}</small>
      </div>
      <p>${post.content}</p>
      <div class="mt-4 flex items-center space-x-4">
        <img src="like-icon.svg" alt="Like" class="w-6 h-6 cursor-pointer" onclick="likePost(${post.id})" />
        <span id="like-count-${post.id}">${post.likes || 0} likes</span>
        <img src="dislike-icon.svg" alt="Dislike" class="w-6 h-6 cursor-pointer" onclick="dislikePost(${post.id})" />
        <span id="dislike-count-${post.id}">${post.dislikes || 0} dislikes</span>
      </div>
      <div class="mt-4 flex items-center space-x-4">
        <button onclick="editPost(${post.id}, '${post.content}')" 
                class="bg-yellow-500 text-white px-4 py-2 rounded">
          Edit
        </button>
        <button onclick="deletePost(${post.id})" 
                class="bg-red-500 text-white px-4 py-2 rounded">
          Delete
        </button>
      </div>
      <div class="mt-6">
        <h3 class="text-lg font-bold mb-2">Comments</h3>
        <div id="commentsContainer-${post.id}" class="space-y-2"></div>
        <form id="commentForm-${post.id}" class="mt-2">
          <textarea id="commentContent-${post.id}" class="w-full p-2 border rounded" placeholder="Write a comment..."></textarea>
          <button type="submit" class="bg-blue-500 text-white px-4 py-2 rounded mt-2">Add Comment</button>
        </form>
      </div>
    </div>
  `).join('');

  posts.forEach(post => {
    const postId = post.id;
    const commentForm = document.getElementById(`commentForm-${post.id}`);
    if (commentForm) {
      commentForm.addEventListener('submit', async (event) => {
        event.preventDefault();
        const textarea = document.getElementById(`commentContent-${post.id}`);
        const commentsContainer = document.getElementById(`commentsContainer-${post.id}`);
        if (textarea && commentsContainer) {
          // Get the comment text
          const commentText = textarea.value;

          if (commentText.trim() !== "") {
            // Create a new comment element
            const commentElement = document.createElement('div');
            commentElement.className = 'bg-gray-100 p-2 rounded shadow';
            commentElement.textContent = commentText;

            // Append the comment to the comments container
            commentsContainer.appendChild(commentElement);

          if (!commentText) {
            alert('Comment content cannot be empty!');
            return;
          }
          console.log(commentText);

          const token = localStorage.getItem('token');
          try {
            const response = await fetch(`${API_BASE_URL}/posts/${postId}/comments`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${token}`,
              },
              body: JSON.stringify({ content: commentText }),
            });
        
            if (response.ok) {
              document.getElementById(`commentContent-${postId}`).value = '';              
              // Neuladen der Posts nach erfolgreichem Erstellen
              loadComments(postId);
              // Clear the textarea
              textarea.value = '';
            } else {
              throw new Error(await response.text());
            }
          } catch (err) {
            console.error('Error creating comment:', err);
            alert('Failed to create comment.');
          }          
        }
        }
      });
    }
  });

  // Lade Kommentare für jeden Post
  //posts.forEach(post => loadComments(post.id));
}

// Edit Post
async function editPost(postId, oldContent) {
  const newContent = prompt('Edit your post:', oldContent);
  if (!newContent) {
    return //alert('Post content cannot be empty!');
  }

  const token = localStorage.getItem('token');
  try {
    const response = await fetch(`${API_BASE_URL}/posts/${postId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ content: newContent }),
    });

    if (response.ok) {
      //alert('Post updated successfully!');
      loadPosts();
    } else {
      throw new Error(await response.text());
    }
  } catch (err) {
    console.error('Error updating post:', err);
    alert('Failed to update post.');
  }
}

// Delete Post
async function deletePost(postId) {
  const confirmation = confirm('Are you sure you want to delete this post?');
  if (!confirmation) return;

  const token = localStorage.getItem('token');
  try {
    const response = await fetch(`${API_BASE_URL}/posts/${postId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    });

    if (response.ok) {
      //alert('Post deleted successfully!');
      loadPosts();
    } else {
      throw new Error(await response.text());
    }
  } catch (err) {
    console.error('Error deleting post:', err);
    alert('Failed to delete post.');
  }
}

// Load Comments
async function loadComments(postId) {
  const token = localStorage.getItem('token');
  try {
    const response = await fetch(`${API_BASE_URL}/posts/${postId}/comments`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (response.ok) {
      const comments = await response.json();
      renderComments(postId, comments);
    } else {
      console.error(`Failed to load comments for postId ${postId}:`, await response.text());
    }
  } catch (err) {
    console.error('Error loading comments:', err);
  }
}

// Render Comments
 function renderComments(postId, comments) {
  const commentsContainer = document.getElementById(`commentsContainer-${postId}`);
  if (!commentsContainer) {
    console.error(`Comments container for postId ${postId} not found.`);
    return; // Abbrechen, wenn das Element nicht existiert
  }

  if (!comments || comments.length === 0) {
    commentsContainer.innerHTML = `<p class="text-gray-500">No comments yet.</p>`;
    return;
  }

  commentsContainer.innerHTML = comments.map(comment => `
    <div class="bg-gray-100 p-2 rounded shadow">
      <p class="mb-2"><strong>${comment.username}</strong>: ${comment.content}</p>
      <p class="text-gray-500 text-sm">${new Date(comment.created_at).toLocaleString()}</p>
      <button onclick="editComment(${postId}, ${comment.id}, '${comment.content}')" class="bg-yellow-500 text-white px-2 py-1 rounded">Edit</button>
      <button onclick="deleteComment(${postId}, ${comment.id})" class="bg-red-500 text-white px-2 py-1 rounded ml-2">Delete</button>
    </div>
  `).join('');
}

 // Edit Comment
async function editComment(postId, commentId, oldContent) {
  const newContent = prompt('Edit your comment:', oldContent);
  if (!newContent) return;

  const token = localStorage.getItem('token');
  try {
    const response = await fetch(`${API_BASE_URL}/posts/${postId}/comments/${commentId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ content: newContent }),
    });

    if (response.ok) {
      loadComments(postId);
    } else {
      throw new Error(await response.text());
    }
  } catch (err) {
    console.error('Error updating comment:', err);
    alert('Failed to update comment.');
  }
}

// Delete Comment
async function deleteComment(postId, commentId) {
  const token = localStorage.getItem('token');
  try {
    const response = await fetch(`${API_BASE_URL}/posts/${postId}/comments/${commentId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    });

    if (response.ok) {
      loadComments(postId);
    } else {
      throw new Error(await response.text());
    }
  } catch (err) {
    console.error('Error deleting comment:', err);
    alert('Failed to delete comment.');
  }
}

// Like eines Posts
async function likePost(postId) {
  try {
    const response = await fetch(`${API_BASE_URL}/posts/${postId}/like`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
    });
    if (response.ok) {
      const data = await response.json();
      document.getElementById(`like-count-${postId}`).innerText = `${data.likes || 0} likes`;
      document.getElementById(`dislike-count-${postId}`).innerText = `${data.dislikes || 0} dislikes`;
    } else {
      throw new Error('Failed to like post');
    }
  } catch (error) {
    console.error('Error liking post:', error);
  }
}

async function dislikePost(postId) {
  try {
    const response = await fetch(`${API_BASE_URL}/posts/${postId}/dislike`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
    });
    if (response.ok) {
      const data = await response.json();
      document.getElementById(`like-count-${postId}`).innerText = `${data.likes || 0} likes`;
      document.getElementById(`dislike-count-${postId}`).innerText = `${data.dislikes || 0} dislikes`;
    } else {
      throw new Error('Failed to dislike post');
    }
  } catch (error) {
    console.error('Error disliking post:', error);
  }
}