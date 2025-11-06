import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';

function Feed({ onLogout }) {
  const navigate = useNavigate();
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  // New post states
  const [postType, setPostType] = useState('text'); // 'text' or 'file'
  const [textContent, setTextContent] = useState('');
  const [selectedFile, setSelectedFile] = useState(null);
  const [caption, setCaption] = useState('');
  const [posting, setPosting] = useState(false);
  const [postError, setPostError] = useState('');
  const fileInputRef = useRef(null);
  const [isAdmin, setIsAdmin] = useState(false);

  const username = localStorage.getItem('username');

  // Check if user is admin
  useEffect(() => {
    const checkAdmin = async () => {
      try {
        const token = localStorage.getItem('token');
        const response = await fetch('https://api.ashtonashton.net/admin/users', {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        // If this succeeds, user is an admin
        if (response.ok) {
          setIsAdmin(true);
        }
      } catch (err) {
        // Not an admin or error, keep isAdmin as false
      }
    };
    checkAdmin();
  }, []);

  // Load posts
  const loadPosts = async (pageNum = 1, append = false, silent = false) => {
    if (!silent) {
      setLoading(true);
    }
    setError('');

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`https://api.ashtonashton.net/feed?page=${pageNum}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to load feed');
      }

      const data = await response.json();

      if (append) {
        setPosts(prev => [...prev, ...data.posts]);
      } else {
        setPosts(data.posts);
      }

      // Check if there are more posts
      setHasMore(data.posts.length === 20);
    } catch (err) {
      if (!silent) {
        setError(err.message);
      }
    } finally {
      if (!silent) {
        setLoading(false);
      }
    }
  };

  // Initial load
  useEffect(() => {
    loadPosts(1);
  }, []);

  // Auto-refresh feed every 15 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      // Silently refresh the first page to check for new posts
      loadPosts(1, false, true);
    }, 15000); // 15 seconds

    return () => clearInterval(interval);
  }, []);

  // Load more posts
  const handleLoadMore = () => {
    const nextPage = page + 1;
    setPage(nextPage);
    loadPosts(nextPage, true);
  };

  // Handle file selection
  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 100 * 1024 * 1024) {
        setPostError('File too large. Max size is 100MB for posts');
        return;
      }
      setSelectedFile(file);
      setPostError('');
    }
  };


  // Download file
  const handleDownload = async (postId, filename) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`https://api.ashtonashton.net/posts/${postId}/download`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to download file');
      }

      // Get the blob from the response
      const blob = await response.blob();
      
      // Create a temporary URL for the blob
      const url = window.URL.createObjectURL(blob);
      
      // Create a temporary anchor element and trigger download
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      
      // Cleanup
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      alert('Download failed: ' + err.message);
    }
  };

  // Create text post
  const handleCreateTextPost = async () => {
    if (!textContent.trim()) {
      setPostError('Text content cannot be empty');
      return;
    }

    if (textContent.length > 1000) {
      setPostError('Text exceeds 1000 character limit');
      return;
    }

    setPosting(true);
    setPostError('');

    try {
      const token = localStorage.getItem('token');
      const formData = new FormData();
      formData.append('content', textContent);

      const response = await fetch('https://api.ashtonashton.net/posts/text', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to create post');
      }

      // Clear form and reload feed
      setTextContent('');
      setPage(1);
      loadPosts(1);
    } catch (err) {
      setPostError(err.message);
    } finally {
      setPosting(false);
    }
  };

  // Create file post
  const handleCreateFilePost = async () => {
    if (!selectedFile) {
      setPostError('Please select a file');
      return;
    }

    if (caption && caption.length > 1000) {
      setPostError('Caption exceeds 1000 character limit');
      return;
    }

    setPosting(true);
    setPostError('');

    try {
      const token = localStorage.getItem('token');
      const formData = new FormData();
      formData.append('file', selectedFile);
      if (caption) {
        formData.append('caption', caption);
      }

      const response = await fetch('https://api.ashtonashton.net/posts/file', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to create post');
      }

      // Clear form and reload feed
      setSelectedFile(null);
      setCaption('');
      fileInputRef.current.value = '';
      setPage(1);
      loadPosts(1);
    } catch (err) {
      setPostError(err.message);
    } finally {
      setPosting(false);
    }
  };

  // Delete post
  const handleDeletePost = async (postId) => {
    if (!window.confirm('Delete this post?')) return;

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`https://api.ashtonashton.net/posts/${postId}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to delete post');
      }

      // Reload feed
      setPage(1);
      loadPosts(1);
    } catch (err) {
      alert('Delete failed: ' + err.message);
    }
  };

  // Toggle dislike on post (optimistic UI update)
  const handleDislike = async (postId) => {
    // Step 1: Optimistically update UI
    setPosts((prevPosts) =>
      prevPosts.map((post) =>
        post.id === postId
          ? {
              ...post,
              is_disliked: !post.is_disliked,
              dislike_count: post.dislike_count + (post.is_disliked ? -1 : 1),
            }
          : post
      )
    );

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`https://api.ashtonashton.net/posts/${postId}/dislike`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to toggle dislike');
      }


      loadPosts(page, false, true);

    } catch (err) {
      // Step 2: Revert the optimistic update on failure
      setPosts((prevPosts) =>
        prevPosts.map((post) =>
          post.id === postId
            ? {
                ...post,
                is_disliked: !post.is_disliked,
                dislike_count: post.dislike_count + (post.is_disliked ? -1 : 1),
              }
            : post
        )
      );
    }
  };

  // Format bytes
  const formatBytes = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  // Format date
  const formatDate = (dateString) => {
    // Parse the UTC timestamp from SQLite and convert to local time
    const date = new Date(dateString + 'Z'); // Adding 'Z' ensures it's treated as UTC
    return date.toLocaleString();
  };

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto', padding: '20px' }}>
      {/* Header */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '30px',
        borderBottom: '2px solid #dee2e6',
        paddingBottom: '10px'
      }}>
        <h1>Feed</h1>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span style={{ marginRight: '5px' }}>Welcome, {username}!</span>
          {isAdmin && (
            <button
              onClick={() => navigate('/admin')}
              style={{
                padding: '8px 15px',
                backgroundColor: '#dc3545',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                fontWeight: 'bold'
              }}
            >
              Admin Panel
            </button>
          )}
          <button
            onClick={() => navigate('/change-password')}
            style={{
              padding: '8px 15px',
              backgroundColor: '#007bff',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            Change Password
          </button>
          <button
            onClick={onLogout}
            style={{
              padding: '8px 15px',
              backgroundColor: '#6c757d',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            Logout
          </button>
        </div>
      </div>

      {/* Create Post Section */}
      <div style={{
        padding: '20px',
        backgroundColor: '#f8f9fa',
        borderRadius: '8px',
        marginBottom: '30px'
      }}>
        <h3>Create Post</h3>

        {/* Post Type Toggle */}
        <div style={{ marginBottom: '15px' }}>
          <button
            onClick={() => setPostType('text')}
            style={{
              padding: '8px 16px',
              backgroundColor: postType === 'text' ? '#007bff' : '#e9ecef',
              color: postType === 'text' ? 'white' : 'black',
              border: 'none',
              borderRadius: '4px',
              marginRight: '10px',
              cursor: 'pointer'
            }}
          >
            Text Post
          </button>
          <button
            onClick={() => setPostType('file')}
            style={{
              padding: '8px 16px',
              backgroundColor: postType === 'file' ? '#007bff' : '#e9ecef',
              color: postType === 'file' ? 'white' : 'black',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            File Post
          </button>
        </div>

        {/* Text Post Form */}
        {postType === 'text' && (
          <div>
            <textarea
              value={textContent}
              onChange={(e) => setTextContent(e.target.value)}
              placeholder="What's on your mind? (max 1000 characters)"
              maxLength={1000}
              style={{
                width: '100%',
                minHeight: '100px',
                padding: '10px',
                borderRadius: '4px',
                border: '1px solid #ced4da',
                resize: 'vertical',
                fontFamily: 'inherit',
                boxSizing: 'border-box'
              }}
            />
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '10px' }}>
              <span style={{ fontSize: '14px', color: '#6c757d' }}>
                {textContent.length}/1000 characters
              </span>
              <button
                onClick={handleCreateTextPost}
                disabled={posting || !textContent.trim()}
                style={{
                  padding: '10px 20px',
                  backgroundColor: posting || !textContent.trim() ? '#ccc' : '#28a745',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: posting || !textContent.trim() ? 'not-allowed' : 'pointer'
                }}
              >
                {posting ? 'Posting...' : 'Post'}
              </button>
            </div>
          </div>
        )}

        {/* File Post Form */}
        {postType === 'file' && (
          <div>
            {/* Hidden file input */}
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileSelect}
              disabled={posting}
              style={{ display: 'none' }}
              id="file-input"
            />
            
            {/* Custom button */}
            <label 
              htmlFor="file-input"
              style={{
                display: 'inline-block',
                padding: '10px 20px',
                backgroundColor: selectedFile ? '#28a745' : '#007bff',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: posting ? 'not-allowed' : 'pointer',
                marginBottom: '10px',
                opacity: posting ? 0.6 : 1
              }}
            >
              {selectedFile ? 'Change File' : 'Choose File'}
            </label>
            
            {selectedFile && (
              <p style={{ fontSize: '14px', color: '#6c757d', marginTop: '5px', marginBottom: '10px' }}>
                Selected: {selectedFile.name} ({formatBytes(selectedFile.size)})
              </p>
            )}
            
            <textarea
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              placeholder="Optional caption (max 1000 characters)"
              maxLength={1000}
              style={{
                width: '100%',
                minHeight: '60px',
                padding: '10px',
                borderRadius: '4px',
                border: '1px solid #ced4da',
                resize: 'vertical',
                fontFamily: 'inherit',
                marginTop: '10px',
                boxSizing: 'border-box'
              }}
            />
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '10px' }}>
              <span style={{ fontSize: '14px', color: '#6c757d' }}>
                {caption.length}/1000 characters
              </span>
              <button
                onClick={handleCreateFilePost}
                disabled={posting || !selectedFile}
                style={{
                  padding: '10px 20px',
                  backgroundColor: posting || !selectedFile ? '#ccc' : '#28a745',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: posting || !selectedFile ? 'not-allowed' : 'pointer'
                }}
              >
                {posting ? 'Posting...' : 'Post'}
              </button>
            </div>
          </div>
        )}

        {postError && <p style={{ color: 'red', marginTop: '10px' }}>{postError}</p>}
      </div>

      {/* Feed */}
      {loading && page === 1 ? (
        <div>Loading feed...</div>
      ) : error ? (
        <div style={{ color: 'red' }}>Error: {error}</div>
      ) : posts.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '40px', color: '#6c757d' }}>
          <p>No posts yet. Be the first to post!</p>
        </div>
      ) : (
        <div>
          {posts.map((post) => (
            <div
              key={post.id}
              style={{
                padding: '20px',
                backgroundColor: 'white',
                border: '1px solid #dee2e6',
                borderRadius: '8px',
                marginBottom: '15px'
              }}
            >
              {/* Post Header */}
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                marginBottom: '10px',
                fontSize: '14px',
                color: '#6c757d'
              }}>
                <span>{formatDate(post.created_at)}</span>
              </div>

              {/* Post Content */}
              {post.post_type === 'text' ? (
                <p style={{ whiteSpace: 'pre-wrap', marginBottom: '15px' }}>{post.content}</p>
              ) : (
                <div>
                  {post.caption && (
                    <p style={{ whiteSpace: 'pre-wrap', marginBottom: '10px' }}>{post.caption}</p>
                  )}
                  <div style={{
                    padding: '15px',
                    backgroundColor: '#f8f9fa',
                    borderRadius: '4px',
                    marginBottom: '15px'
                  }}>
                    <p style={{ margin: 0 }}>
                      <strong>File:</strong> {post.file.filename}
                    </p>
                    <p style={{ margin: '5px 0 0 0', fontSize: '14px', color: '#6c757d' }}>
                      Size: {formatBytes(post.file.size)} | Type: {post.file.mime_type || 'Unknown'}
                    </p>
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                {/* Dislike Button */}
                <button
                  onClick={() => handleDislike(post.id)}
                  style={{
                    padding: '4px 8px',
                    backgroundColor: post.is_disliked ? '#6c757d' : 'transparent',
                    color: post.is_disliked ? 'white' : '#6c757d',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    fontSize: '16px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px'
                  }}
                >
                  👎 <span style={{ fontSize: '14px' }}>{post.dislike_count}</span>
                </button>

                {/* Download Button - Only show for file posts */}
                {post.post_type !== 'text' && post.file && (
                  <button
                    onClick={() => handleDownload(post.id, post.file.filename)}
                    style={{
                      padding: '5px 15px',
                      backgroundColor: '#007bff',
                      color: 'white',
                      border: 'none',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      fontSize: '14px'
                    }}
                  >
                    Download
                  </button>
                )}

                {/* Delete Button - Only show for own posts */}
                {post.is_deletable && (
                  <button
                    onClick={() => handleDeletePost(post.id)}
                    style={{
                      padding: '5px 15px',
                      backgroundColor: '#dc3545',
                      color: 'white',
                      border: 'none',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      fontSize: '14px'
                    }}
                  >
                    Delete
                  </button>
                )}
              </div>
            </div>
          ))}

          {/* Load More Button */}
          {hasMore && (
            <div style={{ textAlign: 'center', marginTop: '20px' }}>
              <button
                onClick={handleLoadMore}
                disabled={loading}
                style={{
                  padding: '10px 30px',
                  backgroundColor: loading ? '#ccc' : '#007bff',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: loading ? 'not-allowed' : 'pointer'
                }}
              >
                {loading ? 'Loading...' : 'Load More'}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default Feed;