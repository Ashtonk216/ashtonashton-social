import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { API_URL } from './config';

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

  // Reply states
  const [expandedPostId, setExpandedPostId] = useState(null);
  const [replies, setReplies] = useState({});
  const [loadingReplies, setLoadingReplies] = useState({});
  const [replyText, setReplyText] = useState('');
  const [replyFile, setReplyFile] = useState(null);
  const [replyCaption, setReplyCaption] = useState('');
  const [replyType, setReplyType] = useState('text');
  const [postingReply, setPostingReply] = useState(false);
  const [replyError, setReplyError] = useState('');
  const replyFileInputRef = useRef(null);

  const username = localStorage.getItem('username');

  // Check if user is admin
  useEffect(() => {
    const checkAdmin = async () => {
      try {
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_URL}/admin/users`, {
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
      const response = await fetch(`${API_URL}/feed?page=${pageNum}`, {
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
      const response = await fetch(`${API_URL}/posts/${postId}/download`, {
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

      const response = await fetch(`${API_URL}/posts/text`, {
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

      const response = await fetch(`${API_URL}/posts/file`, {
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
      const response = await fetch(`${API_URL}/posts/${postId}`, {
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
      const response = await fetch(`${API_URL}/posts/${postId}/dislike`, {
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

  // Fetch replies for a post
  const fetchReplies = async (postId) => {
    setLoadingReplies(prev => ({ ...prev, [postId]: true }));
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/posts/${postId}/replies`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to load replies');
      }

      const data = await response.json();
      setReplies(prev => ({ ...prev, [postId]: data.replies }));
    } catch (err) {
      alert('Failed to load replies: ' + err.message);
    } finally {
      setLoadingReplies(prev => ({ ...prev, [postId]: false }));
    }
  };

  // Toggle replies view
  const handleToggleReplies = async (postId) => {
    if (expandedPostId === postId) {
      setExpandedPostId(null);
    } else {
      setExpandedPostId(postId);
      if (!replies[postId]) {
        await fetchReplies(postId);
      }
    }
  };

  // Create text reply
  const handleCreateTextReply = async (postId) => {
    if (!replyText.trim()) {
      setReplyError('Reply cannot be empty');
      return;
    }

    if (replyText.length > 1000) {
      setReplyError('Reply exceeds 1000 character limit');
      return;
    }

    setPostingReply(true);
    setReplyError('');

    try {
      const token = localStorage.getItem('token');
      const formData = new FormData();
      formData.append('content', replyText);

      const response = await fetch(`${API_URL}/posts/${postId}/reply/text`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to create reply');
      }

      // Clear form and refresh replies
      setReplyText('');
      await fetchReplies(postId);

      // Update reply count in posts
      setPosts(prevPosts =>
        prevPosts.map(post =>
          post.id === postId
            ? { ...post, reply_count: (post.reply_count || 0) + 1 }
            : post
        )
      );
    } catch (err) {
      setReplyError(err.message);
    } finally {
      setPostingReply(false);
    }
  };

  // Create file reply
  const handleCreateFileReply = async (postId) => {
    if (!replyFile) {
      setReplyError('Please select a file');
      return;
    }

    if (replyCaption && replyCaption.length > 1000) {
      setReplyError('Caption exceeds 1000 character limit');
      return;
    }

    setPostingReply(true);
    setReplyError('');

    try {
      const token = localStorage.getItem('token');
      const formData = new FormData();
      formData.append('file', replyFile);
      if (replyCaption) {
        formData.append('caption', replyCaption);
      }

      const response = await fetch(`${API_URL}/posts/${postId}/reply/file`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to create reply');
      }

      // Clear form and refresh replies
      setReplyFile(null);
      setReplyCaption('');
      if (replyFileInputRef.current) {
        replyFileInputRef.current.value = '';
      }
      await fetchReplies(postId);

      // Update reply count in posts
      setPosts(prevPosts =>
        prevPosts.map(post =>
          post.id === postId
            ? { ...post, reply_count: (post.reply_count || 0) + 1 }
            : post
        )
      );
    } catch (err) {
      setReplyError(err.message);
    } finally {
      setPostingReply(false);
    }
  };

  // Toggle dislike on reply
  const handleReplyDislike = async (postId, replyId) => {
    // Optimistically update UI
    setReplies(prev => ({
      ...prev,
      [postId]: prev[postId].map(reply =>
        reply.id === replyId
          ? {
              ...reply,
              is_disliked: !reply.is_disliked,
              dislike_count: reply.dislike_count + (reply.is_disliked ? -1 : 1),
            }
          : reply
      ),
    }));

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/posts/${replyId}/dislike`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to toggle dislike');
      }
    } catch (err) {
      // Revert on failure
      setReplies(prev => ({
        ...prev,
        [postId]: prev[postId].map(reply =>
          reply.id === replyId
            ? {
                ...reply,
                is_disliked: !reply.is_disliked,
                dislike_count: reply.dislike_count + (reply.is_disliked ? -1 : 1),
              }
            : reply
        ),
      }));
      alert('Failed to dislike reply: ' + err.message);
    }
  };

  // Delete reply
  const handleDeleteReply = async (postId, replyId) => {
    if (!window.confirm('Delete this reply?')) return;

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/posts/${replyId}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to delete reply');
      }

      // Refresh replies
      await fetchReplies(postId);

      // Update reply count in posts
      setPosts(prevPosts =>
        prevPosts.map(post =>
          post.id === postId
            ? { ...post, reply_count: Math.max(0, (post.reply_count || 0) - 1) }
            : post
        )
      );
    } catch (err) {
      alert('Delete failed: ' + err.message);
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
              <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
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

                {/* Reply Button */}
                <button
                  onClick={() => handleToggleReplies(post.id)}
                  style={{
                    padding: '5px 15px',
                    backgroundColor: expandedPostId === post.id ? '#28a745' : '#6c757d',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    fontSize: '14px'
                  }}
                >
                  💬 {post.reply_count || 0} {post.reply_count === 1 ? 'reply' : 'replies'}
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

              {/* Replies Section */}
              {expandedPostId === post.id && (
                <div style={{
                  marginTop: '20px',
                  paddingTop: '20px',
                  borderTop: '1px solid #dee2e6'
                }}>
                  {/* Loading State */}
                  {loadingReplies[post.id] && (
                    <div style={{ textAlign: 'center', padding: '20px', color: '#6c757d' }}>
                      Loading replies...
                    </div>
                  )}

                  {/* Replies List */}
                  {!loadingReplies[post.id] && replies[post.id] && (
                    <div>
                      {replies[post.id].length === 0 ? (
                        <div style={{ textAlign: 'center', padding: '20px', color: '#6c757d' }}>
                          No replies yet. Be the first to reply!
                        </div>
                      ) : (
                        <div style={{ marginBottom: '20px' }}>
                          {replies[post.id].map((reply) => (
                            <div
                              key={reply.id}
                              style={{
                                padding: '15px',
                                backgroundColor: '#f8f9fa',
                                borderRadius: '8px',
                                marginBottom: '10px',
                                marginLeft: '20px'
                              }}
                            >
                              {/* Reply Header */}
                              <div style={{
                                fontSize: '12px',
                                color: '#6c757d',
                                marginBottom: '8px',
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center'
                              }}>
                                <span>{formatDate(reply.created_at)}</span>
                              </div>

                              {/* Reply Content */}
                              {reply.post_type === 'text' ? (
                                <p style={{ whiteSpace: 'pre-wrap', margin: '0 0 10px 0' }}>{reply.content}</p>
                              ) : (
                                <div>
                                  {reply.caption && (
                                    <p style={{ whiteSpace: 'pre-wrap', marginBottom: '8px' }}>{reply.caption}</p>
                                  )}
                                  <div style={{
                                    padding: '10px',
                                    backgroundColor: '#fff',
                                    borderRadius: '4px',
                                    marginBottom: '10px'
                                  }}>
                                    <p style={{ margin: 0, fontSize: '14px' }}>
                                      <strong>File:</strong> {reply.file.filename}
                                    </p>
                                    <p style={{ margin: '5px 0 0 0', fontSize: '12px', color: '#6c757d' }}>
                                      {formatBytes(reply.file.size)}
                                    </p>
                                  </div>
                                </div>
                              )}

                              {/* Reply Actions */}
                              <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                                <button
                                  onClick={() => handleReplyDislike(post.id, reply.id)}
                                  style={{
                                    padding: '3px 6px',
                                    backgroundColor: reply.is_disliked ? '#6c757d' : 'transparent',
                                    color: reply.is_disliked ? 'white' : '#6c757d',
                                    border: 'none',
                                    borderRadius: '4px',
                                    cursor: 'pointer',
                                    fontSize: '14px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '4px'
                                  }}
                                >
                                  👎 <span style={{ fontSize: '12px' }}>{reply.dislike_count}</span>
                                </button>

                                {reply.post_type !== 'text' && reply.file && (
                                  <button
                                    onClick={() => handleDownload(reply.id, reply.file.filename)}
                                    style={{
                                      padding: '4px 12px',
                                      backgroundColor: '#007bff',
                                      color: 'white',
                                      border: 'none',
                                      borderRadius: '4px',
                                      cursor: 'pointer',
                                      fontSize: '12px'
                                    }}
                                  >
                                    Download
                                  </button>
                                )}

                                {reply.is_deletable && (
                                  <button
                                    onClick={() => handleDeleteReply(post.id, reply.id)}
                                    style={{
                                      padding: '4px 12px',
                                      backgroundColor: '#dc3545',
                                      color: 'white',
                                      border: 'none',
                                      borderRadius: '4px',
                                      cursor: 'pointer',
                                      fontSize: '12px'
                                    }}
                                  >
                                    Delete
                                  </button>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Reply Form */}
                      <div style={{
                        padding: '15px',
                        backgroundColor: '#fff',
                        border: '1px solid #dee2e6',
                        borderRadius: '8px',
                        marginTop: '10px'
                      }}>
                        <h4 style={{ margin: '0 0 10px 0', fontSize: '16px' }}>Add a reply</h4>

                        {/* Reply Type Selector */}
                        <div style={{ display: 'flex', gap: '10px', marginBottom: '10px' }}>
                          <button
                            onClick={() => setReplyType('text')}
                            style={{
                              padding: '8px 16px',
                              backgroundColor: replyType === 'text' ? '#007bff' : '#e9ecef',
                              color: replyType === 'text' ? 'white' : '#495057',
                              border: 'none',
                              borderRadius: '4px',
                              cursor: 'pointer',
                              fontSize: '14px'
                            }}
                          >
                            Text Reply
                          </button>
                          <button
                            onClick={() => setReplyType('file')}
                            style={{
                              padding: '8px 16px',
                              backgroundColor: replyType === 'file' ? '#007bff' : '#e9ecef',
                              color: replyType === 'file' ? 'white' : '#495057',
                              border: 'none',
                              borderRadius: '4px',
                              cursor: 'pointer',
                              fontSize: '14px'
                            }}
                          >
                            File Reply
                          </button>
                        </div>

                        {/* Text Reply Form */}
                        {replyType === 'text' && (
                          <div>
                            <textarea
                              value={replyText}
                              onChange={(e) => setReplyText(e.target.value)}
                              placeholder="Write your reply..."
                              style={{
                                width: '100%',
                                padding: '10px',
                                minHeight: '80px',
                                border: '1px solid #ced4da',
                                borderRadius: '4px',
                                marginBottom: '10px',
                                resize: 'vertical',
                                boxSizing: 'border-box'
                              }}
                            />
                            <div style={{ fontSize: '12px', color: '#6c757d', marginBottom: '10px' }}>
                              {replyText.length}/1000 characters
                            </div>
                            <button
                              onClick={() => handleCreateTextReply(post.id)}
                              disabled={postingReply || !replyText.trim()}
                              style={{
                                padding: '8px 16px',
                                backgroundColor: postingReply || !replyText.trim() ? '#ccc' : '#28a745',
                                color: 'white',
                                border: 'none',
                                borderRadius: '4px',
                                cursor: postingReply || !replyText.trim() ? 'not-allowed' : 'pointer',
                                fontSize: '14px'
                              }}
                            >
                              {postingReply ? 'Posting...' : 'Post Reply'}
                            </button>
                          </div>
                        )}

                        {/* File Reply Form */}
                        {replyType === 'file' && (
                          <div>
                            {/* Hidden file input */}
                            <input
                              type="file"
                              ref={replyFileInputRef}
                              onChange={(e) => {
                                const file = e.target.files[0];
                                if (file && file.size > 100 * 1024 * 1024) {
                                  setReplyError('File too large (max 100MB)');
                                  e.target.value = '';
                                } else {
                                  setReplyFile(file);
                                  setReplyError('');
                                }
                              }}
                              style={{ display: 'none' }}
                            />

                            {/* Custom file select button */}
                            <button
                              type="button"
                              onClick={() => replyFileInputRef.current?.click()}
                              style={{
                                padding: '6px 12px',
                                backgroundColor: '#007bff',
                                color: 'white',
                                border: 'none',
                                borderRadius: '4px',
                                cursor: 'pointer',
                                fontSize: '14px',
                                marginBottom: '10px',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px'
                              }}
                            >
                              Choose File
                            </button>

                            {replyFile && (
                              <div style={{
                                padding: '10px',
                                backgroundColor: '#e9ecef',
                                borderRadius: '4px',
                                marginBottom: '10px',
                                fontSize: '14px'
                              }}>
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                  <div>
                                    <strong>Selected:</strong> {replyFile.name}
                                    <div style={{ color: '#6c757d', fontSize: '12px', marginTop: '4px' }}>
                                      Size: {formatBytes(replyFile.size)}
                                    </div>
                                  </div>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setReplyFile(null);
                                      if (replyFileInputRef.current) {
                                        replyFileInputRef.current.value = '';
                                      }
                                    }}
                                    style={{
                                      padding: '4px 8px',
                                      backgroundColor: '#dc3545',
                                      color: 'white',
                                      border: 'none',
                                      borderRadius: '4px',
                                      cursor: 'pointer',
                                      fontSize: '12px'
                                    }}
                                  >
                                    Remove
                                  </button>
                                </div>
                              </div>
                            )}
                            <textarea
                              value={replyCaption}
                              onChange={(e) => setReplyCaption(e.target.value)}
                              placeholder="Add a caption (optional)..."
                              style={{
                                width: '100%',
                                padding: '10px',
                                minHeight: '60px',
                                border: '1px solid #ced4da',
                                borderRadius: '4px',
                                marginBottom: '10px',
                                resize: 'vertical',
                                boxSizing: 'border-box'
                              }}
                            />
                            <button
                              onClick={() => handleCreateFileReply(post.id)}
                              disabled={postingReply || !replyFile}
                              style={{
                                padding: '8px 16px',
                                backgroundColor: postingReply || !replyFile ? '#ccc' : '#28a745',
                                color: 'white',
                                border: 'none',
                                borderRadius: '4px',
                                cursor: postingReply || !replyFile ? 'not-allowed' : 'pointer',
                                fontSize: '14px'
                              }}
                            >
                              {postingReply ? 'Posting...' : 'Post Reply'}
                            </button>
                          </div>
                        )}

                        {replyError && (
                          <p style={{ color: '#dc3545', marginTop: '10px', fontSize: '14px' }}>
                            {replyError}
                          </p>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}
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