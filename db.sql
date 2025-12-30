SET FOREIGN_KEY_CHECKS = 0;
-- USERS
DROP TABLE IF EXISTS users;
CREATE TABLE users (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role ENUM('admin','user') DEFAULT 'user',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP NULL
);

-- PROJECTS
DROP TABLE IF EXISTS projects;
CREATE TABLE projects (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    start_date DATE,
    end_date DATE,
    status VARCHAR(255),
    created_by BIGINT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP NULL,
    FOREIGN KEY (created_by) REFERENCES users(id)
);

-- PROJECT MEMBERS
DROP TABLE IF EXISTS project_members;
CREATE TABLE project_members (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    project_id BIGINT NOT NULL,
    user_id BIGINT NOT NULL,
    role ENUM('owner','manager','member','client','viewer') DEFAULT 'member',
    status ENUM('invited', 'accepted', 'declined') DEFAULT 'invited',
    invited_by BIGINT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP NULL,
    FOREIGN KEY (project_id) REFERENCES projects(id),
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (invited_by) REFERENCES users(id)
);

-- TASKS
DROP TABLE IF EXISTS tasks;
CREATE TABLE tasks (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    project_id BIGINT NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    status ENUM('todo', 'in_progress', 'review', 'done') DEFAULT 'todo',
    priority ENUM('low','medium','high') DEFAULT 'medium',
    start_date DATE,
    due_date DATE,
    created_by BIGINT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP NULL,
    FOREIGN KEY (project_id) REFERENCES projects(id),
    FOREIGN KEY (created_by) REFERENCES users(id)
);

-- TASK ASSIGNEES
DROP TABLE IF EXISTS task_assignees;
CREATE TABLE task_assignees (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    task_id BIGINT NOT NULL,
    user_id BIGINT NOT NULL,
    deleted_at TIMESTAMP NULL,
    FOREIGN KEY (task_id) REFERENCES tasks(id),
    FOREIGN KEY (user_id) REFERENCES users(id)
);

-- ACTIVITY LOGS
DROP TABLE IF EXISTS activity_logs;
CREATE TABLE activity_logs (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    task_id BIGINT NOT NULL,
    actor_id BIGINT,
    detail VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP NULL,
    FOREIGN KEY (task_id) REFERENCES tasks(id),
    FOREIGN KEY (actor_id) REFERENCES users(id)
);

-- PROGRESS LOGS
DROP TABLE IF EXISTS progress_logs;
CREATE TABLE progress_logs (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    task_id BIGINT NOT NULL,
    updated_by BIGINT NOT NULL,
    progress INT CHECK (progress >= 0 AND progress <= 100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP NULL,
    FOREIGN KEY (task_id) REFERENCES tasks(id),
    FOREIGN KEY (updated_by) REFERENCES users(id)
);
 
-- COMMENTS
DROP TABLE IF EXISTS comments;
CREATE TABLE comments (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT NOT NULL,
	task_id BIGINT NULL,
    file_version_id BIGINT NULL,
    content TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP NULL,
    FOREIGN KEY (task_id) REFERENCES tasks(id),
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (file_version_id) REFERENCES file_versions(id)
);

-- FILES
DROP TABLE IF EXISTS files;
CREATE TABLE files (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    project_id BIGINT NULL,
    task_id BIGINT NULL,
    created_by BIGINT NOT NULL,
    file_name VARCHAR(255) NOT NULL,
    category ENUM('project', 'task', 'user_avatar', 'other') DEFAULT 'other',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP NULL,
    FOREIGN KEY (project_id) REFERENCES projects(id),
    FOREIGN KEY (task_id) REFERENCES tasks(id),
    FOREIGN KEY (created_by) REFERENCES users(id)
);

-- VERSION	
DROP TABLE IF EXISTS file_versions;
CREATE TABLE file_versions (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    file_id BIGINT NOT NULL,
    version_number INT NOT NULL,
    file_url VARCHAR(500) NOT NULL,
    file_type VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
	deleted_at TIMESTAMP NULL,
    FOREIGN KEY (file_id) REFERENCES files(id),
    UNIQUE (file_id, version_number)
);

-- VISUAL ANNOTATIONS (comment trực quan)
DROP TABLE IF EXISTS visual_annotations;
CREATE TABLE visual_annotations (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    comment_id BIGINT NOT NULL,
    file_version_id BIGINT NOT NULL,
    coordinates JSON NOT NULL, -- {x, y, width, height} hoặc danh sách điểm cho polygon
    color VARCHAR(20) DEFAULT '#FF0000',
    opacity DECIMAL(3,2) DEFAULT 0.5,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP NULL,
    FOREIGN KEY (comment_id) REFERENCES comments(id),
    FOREIGN KEY (file_version_id) REFERENCES file_versions(id)
);

-- NOTIFICATIONS
DROP TABLE IF EXISTS notifications;
CREATE TABLE notifications (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    recipient_id BIGINT NOT NULL, -- người nhận
    actor_id BIGINT NOT NULL,     -- người gây ra hành động (A comment, A upload)
    type VARCHAR(255) NOT NULL,
    reference_type ENUM('project','task','file','file_version','comment','chat_message','chat_channel') NOT NULL,
    reference_id BIGINT NOT NULL, -- id thực thể liên quan
    message TEXT, -- mô tả chi tiết (nếu muốn hiển thị nội dung)
    status ENUM('new','unread','read') DEFAULT 'new',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP NULL,
    FOREIGN KEY (recipient_id) REFERENCES users(id),
    FOREIGN KEY (actor_id) REFERENCES users(id)
);

-- CHAT CHANNELS
DROP TABLE IF EXISTS chat_channels;
CREATE TABLE chat_channels (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    project_id BIGINT NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    created_by BIGINT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP NULL,
    FOREIGN KEY (project_id) REFERENCES projects(id),
    FOREIGN KEY (created_by) REFERENCES users(id)
);

DROP TABLE IF EXISTS chat_channel_members;
CREATE TABLE chat_channel_members (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    channel_id BIGINT NOT NULL,
    user_id BIGINT NOT NULL,
    joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP NULL,
    FOREIGN KEY (channel_id) REFERENCES chat_channels(id),
    FOREIGN KEY (user_id) REFERENCES users(id),
	UNIQUE KEY unique_channel_user (channel_id, user_id)
);

DROP TABLE IF EXISTS chat_messages;
CREATE TABLE chat_messages (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    channel_id BIGINT NOT NULL,
    sender_id BIGINT NOT NULL,
    content TEXT,
    have_file BOOLEAN NULL DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP NULL,
    FOREIGN KEY (channel_id) REFERENCES chat_channels(id),
    FOREIGN KEY (sender_id) REFERENCES users(id)
);

DROP TABLE IF EXISTS chat_message_files;
CREATE TABLE chat_message_files (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    message_id BIGINT NOT NULL,
    file_id BIGINT NOT NULL,
    FOREIGN KEY (message_id) REFERENCES chat_messages(id),
    FOREIGN KEY (file_id) REFERENCES files(id)
);

DROP TABLE IF EXISTS chat_mentions;
CREATE TABLE chat_mentions (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    message_id BIGINT NOT NULL,
    mentioned_user_id BIGINT NOT NULL,
    FOREIGN KEY (message_id) REFERENCES chat_messages(id),
    FOREIGN KEY (mentioned_user_id) REFERENCES users(id)
);

-- GITHUB
DROP TABLE IF EXISTS github_installations;
CREATE TABLE github_installations (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  installation_id BIGINT UNIQUE,
  account_login VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

DROP TABLE IF EXISTS project_installations;
CREATE TABLE project_installations (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  project_id BIGINT NOT NULL,
  installation_id BIGINT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (project_id) REFERENCES projects(id),
  FOREIGN KEY (installation_id) REFERENCES github_installations(installation_id),
  UNIQUE KEY unique_project_installation (project_id, installation_id)
);

DROP TABLE IF EXISTS project_repositories;
CREATE TABLE project_repositories (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  project_id BIGINT NOT NULL,
  repo_id BIGINT NOT NULL,
  full_name VARCHAR(255) NOT NULL,
  html_url VARCHAR(255),
  is_private BOOLEAN,
  FOREIGN KEY (project_id) REFERENCES projects(id),
  UNIQUE KEY unique_project_repo (project_id, repo_id)
);

SET FOREIGN_KEY_CHECKS = 1;