import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { API_URL } from './config';

function AdminPanel() {
  const [users, setUsers] = useState([]);
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState("users"); // 'users' or 'posts'
  const [postPage, setPostPage] = useState(1);
  const [userPage, setUserPage] = useState(1);
  const ITEMS_PER_PAGE = 20;
  const navigate = useNavigate();

  useEffect(() => {
    loadUsers();
    loadPosts();
  }, []);

  const loadUsers = async () => {
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(`${API_URL}/admin/users`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        if (response.status === 403) {
          setError("Admin access required");
          return;
        }
        throw new Error("Failed to load users");
      }

      const data = await response.json();
      setUsers(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const loadPosts = async () => {
    try {
      const token = localStorage.getItem("token");
      let allPosts = [];
      let page = 1;
      let hasMore = true;

      // Load all pages of posts
      while (hasMore) {
        const response = await fetch(
          `${API_URL}/admin/feed?page=${page}`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );

        if (!response.ok) {
          if (response.status === 403) {
            setError("Admin access required");
            return;
          }
          throw new Error("Failed to load users");
        }

        const data = await response.json();
        const pagePosts = data.posts || [];

        allPosts = [...allPosts, ...pagePosts];

        // If we got less than 20 posts, we've reached the end
        hasMore = pagePosts.length === 20;
        page++;
      }

      setPosts(allPosts);
    } catch (err) {
      console.error("Failed to load posts:", err);
    }
  };

  const handleBanUser = async (userId, username) => {
    if (!window.confirm(`Ban user ${username}?`)) return;

    try {
      const token = localStorage.getItem("token");
      const response = await fetch(
        `${API_URL}/admin/users/${userId}/ban`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error("Failed to ban user");
      }

      alert(`User ${username} has been banned`);
      loadUsers();
    } catch (err) {
      alert("Error: " + err.message);
    }
  };

  const handleUnbanUser = async (userId, username) => {
    if (!window.confirm(`Unban user ${username}?`)) return;

    try {
      const token = localStorage.getItem("token");
      const response = await fetch(
        `${API_URL}/admin/users/${userId}/unban`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error("Failed to unban user");
      }

      alert(`User ${username} has been unbanned`);
      loadUsers();
    } catch (err) {
      alert("Error: " + err.message);
    }
  };

  const handleDeletePost = async (postId) => {
    if (!window.confirm("Delete this post?")) return;

    try {
      const token = localStorage.getItem("token");
      const response = await fetch(
        `${API_URL}/admin/posts/${postId}`,
        {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error("Failed to delete post");
      }

      alert("Post deleted successfully");
      loadPosts();
    } catch (err) {
      alert("Error: " + err.message);
    }
  };

  if (loading) {
    return (
      <div style={{ padding: "20px", textAlign: "center" }}>
        Loading admin panel...
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ padding: "20px", textAlign: "center" }}>
        <h2 style={{ color: "red" }}>{error}</h2>
        <button
          onClick={() => navigate("/")}
          style={{ marginTop: "20px", padding: "10px 20px" }}
        >
          Back to Feed
        </button>
      </div>
    );
  }

  return (
    <div style={{ padding: "20px", maxWidth: "1200px", margin: "0 auto" }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "20px",
        }}
      >
        <h1>Admin Panel</h1>
        <button
          onClick={() => navigate("/")}
          style={{
            padding: "10px 20px",
            backgroundColor: "#6c757d",
            color: "white",
            border: "none",
            borderRadius: "4px",
            cursor: "pointer",
          }}
        >
          Back to Feed
        </button>
      </div>

      {/* Tab Navigation */}
      <div
        style={{
          display: "flex",
          gap: "10px",
          marginBottom: "20px",
          borderBottom: "2px solid #dee2e6",
        }}
      >
        <button
          onClick={() => setActiveTab("users")}
          style={{
            padding: "10px 20px",
            backgroundColor: activeTab === "users" ? "#007bff" : "transparent",
            color: activeTab === "users" ? "white" : "#007bff",
            border: "none",
            borderBottom: activeTab === "users" ? "3px solid #007bff" : "none",
            cursor: "pointer",
            fontSize: "16px",
          }}
        >
          Users ({users.length})
        </button>
        <button
          onClick={() => setActiveTab("posts")}
          style={{
            padding: "10px 20px",
            backgroundColor: activeTab === "posts" ? "#007bff" : "transparent",
            color: activeTab === "posts" ? "white" : "#007bff",
            border: "none",
            borderBottom: activeTab === "posts" ? "3px solid #007bff" : "none",
            cursor: "pointer",
            fontSize: "16px",
          }}
        >
          Posts ({posts.length})
        </button>
      </div>

      {/* Users Tab */}
      {activeTab === "users" && (
        <div>
          <h2>User Management</h2>
          <div style={{ overflowX: "auto" }}>
            <table
              style={{
                width: "100%",
                borderCollapse: "collapse",
                marginTop: "20px",
              }}
            >
              <thead>
                <tr
                  style={{
                    backgroundColor: "#f8f9fa",
                    borderBottom: "2px solid #dee2e6",
                  }}
                >
                  <th style={{ padding: "12px", textAlign: "left" }}>
                    Username
                  </th>
                  <th style={{ padding: "12px", textAlign: "left" }}>Posts</th>
                  <th style={{ padding: "12px", textAlign: "left" }}>Status</th>
                  <th style={{ padding: "12px", textAlign: "left" }}>Role</th>
                  <th style={{ padding: "12px", textAlign: "left" }}>Joined</th>
                  <th style={{ padding: "12px", textAlign: "center" }}>
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {users
                  .slice(
                    (userPage - 1) * ITEMS_PER_PAGE,
                    userPage * ITEMS_PER_PAGE
                  )
                  .map((user) => (
                    <tr
                      key={user.id}
                      style={{ borderBottom: "1px solid #dee2e6" }}
                    >
                      <td style={{ padding: "12px" }}>{user.username}</td>
                      <td style={{ padding: "12px" }}>{user.post_count}</td>
                      <td style={{ padding: "12px" }}>
                        <span
                          style={{
                            padding: "4px 8px",
                            borderRadius: "4px",
                            backgroundColor: user.is_banned
                              ? "#dc3545"
                              : "#28a745",
                            color: "white",
                            fontSize: "12px",
                          }}
                        >
                          {user.is_banned ? "BANNED" : "Active"}
                        </span>
                      </td>
                      <td style={{ padding: "12px" }}>
                        {user.is_admin ? (
                          <span
                            style={{ color: "#007bff", fontWeight: "bold" }}
                          >
                            Admin
                          </span>
                        ) : (
                          "User"
                        )}
                      </td>
                      <td
                        style={{
                          padding: "12px",
                          fontSize: "14px",
                          color: "#6c757d",
                        }}
                      >
                        {new Date(user.created_at).toLocaleDateString()}
                      </td>
                      <td style={{ padding: "12px", textAlign: "center" }}>
                        {!user.is_admin &&
                          (user.is_banned ? (
                            <button
                              onClick={() =>
                                handleUnbanUser(user.id, user.username)
                              }
                              style={{
                                padding: "6px 12px",
                                backgroundColor: "#28a745",
                                color: "white",
                                border: "none",
                                borderRadius: "4px",
                                cursor: "pointer",
                              }}
                            >
                              Unban
                            </button>
                          ) : (
                            <button
                              onClick={() =>
                                handleBanUser(user.id, user.username)
                              }
                              style={{
                                padding: "6px 12px",
                                backgroundColor: "#dc3545",
                                color: "white",
                                border: "none",
                                borderRadius: "4px",
                                cursor: "pointer",
                              }}
                            >
                              Ban
                            </button>
                          ))}
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>

          {/* User Pagination */}
          {users.length > ITEMS_PER_PAGE && (
            <div
              style={{
                display: "flex",
                justifyContent: "center",
                gap: "10px",
                marginTop: "20px",
                alignItems: "center",
              }}
            >
              <button
                onClick={() => setUserPage((p) => Math.max(1, p - 1))}
                disabled={userPage === 1}
                style={{
                  padding: "8px 16px",
                  backgroundColor: userPage === 1 ? "#e9ecef" : "#007bff",
                  color: userPage === 1 ? "#6c757d" : "white",
                  border: "none",
                  borderRadius: "4px",
                  cursor: userPage === 1 ? "not-allowed" : "pointer",
                }}
              >
                Previous
              </button>
              <span style={{ color: "#6c757d" }}>
                Page {userPage} of {Math.ceil(users.length / ITEMS_PER_PAGE)}
              </span>
              <button
                onClick={() =>
                  setUserPage((p) =>
                    Math.min(Math.ceil(users.length / ITEMS_PER_PAGE), p + 1)
                  )
                }
                disabled={userPage >= Math.ceil(users.length / ITEMS_PER_PAGE)}
                style={{
                  padding: "8px 16px",
                  backgroundColor:
                    userPage >= Math.ceil(users.length / ITEMS_PER_PAGE)
                      ? "#e9ecef"
                      : "#007bff",
                  color:
                    userPage >= Math.ceil(users.length / ITEMS_PER_PAGE)
                      ? "#6c757d"
                      : "white",
                  border: "none",
                  borderRadius: "4px",
                  cursor:
                    userPage >= Math.ceil(users.length / ITEMS_PER_PAGE)
                      ? "not-allowed"
                      : "pointer",
                }}
              >
                Next
              </button>
            </div>
          )}
        </div>
      )}

      {/* Posts Tab */}
      {activeTab === "posts" && (
        <div>
          <h2>Post Management</h2>
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "15px",
              marginTop: "20px",
            }}
          >
            {posts
              .slice((postPage - 1) * ITEMS_PER_PAGE, postPage * ITEMS_PER_PAGE)
              .map((post) => (
                <div
                  key={post.id}
                  style={{
                    border: "1px solid #dee2e6",
                    borderRadius: "8px",
                    padding: "15px",
                    backgroundColor: "white",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "start",
                    }}
                  >
                    <div style={{ flex: 1 }}>
                      <div
                        style={{
                          fontSize: "14px",
                          color: "#6c757d",
                          marginBottom: "10px",
                        }}
                      >
                        Post ID: {post.id} | Type: {post.post_type} | Dislikes:{" "}
                        {post.dislike_count} | User: {post.username}
                      </div>
                      {post.post_type === "text" ? (
                        <p style={{ margin: "10px 0" }}>{post.content}</p>
                      ) : (
                        <div>
                          {post.caption && (
                            <p style={{ margin: "10px 0" }}>{post.caption}</p>
                          )}
                          {post.file && (
                            <div style={{ fontSize: "14px", color: "#6c757d" }}>
                              File: {post.file.filename} (
                              {(post.file.size / 1024).toFixed(2)} KB)
                            </div>
                          )}
                        </div>
                      )}
                      <div
                        style={{
                          fontSize: "12px",
                          color: "#6c757d",
                          marginTop: "10px",
                        }}
                      >
                        {new Date(post.created_at).toLocaleString()}
                      </div>
                    </div>
                    <button
                      onClick={() => handleDeletePost(post.id)}
                      style={{
                        padding: "8px 16px",
                        backgroundColor: "#dc3545",
                        color: "white",
                        border: "none",
                        borderRadius: "4px",
                        cursor: "pointer",
                        marginLeft: "15px",
                      }}
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))}
          </div>

          {/* Post Pagination */}
          {posts.length > ITEMS_PER_PAGE && (
            <div
              style={{
                display: "flex",
                justifyContent: "center",
                gap: "10px",
                marginTop: "20px",
                alignItems: "center",
              }}
            >
              <button
                onClick={() => setPostPage((p) => Math.max(1, p - 1))}
                disabled={postPage === 1}
                style={{
                  padding: "8px 16px",
                  backgroundColor: postPage === 1 ? "#e9ecef" : "#007bff",
                  color: postPage === 1 ? "#6c757d" : "white",
                  border: "none",
                  borderRadius: "4px",
                  cursor: postPage === 1 ? "not-allowed" : "pointer",
                }}
              >
                Previous
              </button>
              <span style={{ color: "#6c757d" }}>
                Page {postPage} of {Math.ceil(posts.length / ITEMS_PER_PAGE)}
              </span>
              <button
                onClick={() =>
                  setPostPage((p) =>
                    Math.min(Math.ceil(posts.length / ITEMS_PER_PAGE), p + 1)
                  )
                }
                disabled={postPage >= Math.ceil(posts.length / ITEMS_PER_PAGE)}
                style={{
                  padding: "8px 16px",
                  backgroundColor:
                    postPage >= Math.ceil(posts.length / ITEMS_PER_PAGE)
                      ? "#e9ecef"
                      : "#007bff",
                  color:
                    postPage >= Math.ceil(posts.length / ITEMS_PER_PAGE)
                      ? "#6c757d"
                      : "white",
                  border: "none",
                  borderRadius: "4px",
                  cursor:
                    postPage >= Math.ceil(posts.length / ITEMS_PER_PAGE)
                      ? "not-allowed"
                      : "pointer",
                }}
              >
                Next
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default AdminPanel;
