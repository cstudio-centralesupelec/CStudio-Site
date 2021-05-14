// Functions for blogs: posts, users, ...

const Database = require('better-sqlite3');

class Blog{
	constructor(){
		this.db = new Database("db/blog.db");
		this.db.exec(`CREATE TABLE IF NOT EXISTS users (
			id INTEGER PRIMARY KEY,
			name TEXT NOT NULL,
			rights TEXT NOT NULL
		)`);
		this.db.exec(`CREATE TABLE IF NOT EXISTS users_meta (
			user_id INTEGER,
			key TEXT NOT NULL,
			VALUE TEXT,

			PRIMARY KEY (user_id,key),
			FOREIGN KEY (user_id)
				REFERENCES users (id)
					ON DELETE CASCADE
					ON UPDATE NO ACTION
		)`);
		this.db.exec(`CREATE TABLE IF NOT EXISTS posts (
			id INTEGER PRIMARY KEY,
			title TEXT NOT NULL,
			author INTEGER,
			date INTEGER NOT NULL,
			content TEXT NOT NULL,

			FOREIGN KEY (author)
				REFERENCES users (id)
					ON DELETE CASCADE
					ON UPDATE NO ACTION
		);`); // when a user deletes its account, remove all their posts too.

		this.db.exec(`CREATE TABLE IF NOT EXISTS posts_meta (
		    post_id INTEGER,
		    key TEXT NOT NULL,
		    value TEXT,

		    PRIMARY KEY (post_id,key),
			FOREIGN KEY (post_id)
				REFERENCES posts (id) 
					ON DELETE CASCADE 
					ON UPDATE NO ACTION
		);`);
	}
	recent_posts(limit,offset){
		let statement = this.db.prepare(`SELECT posts.id,title,name AS author,date
			FROM posts JOIN users ON users.id = posts.author ORDER BY date LIMIT ? OFFSET ?`);
		return statement.all(limit,offset);
	}
	search_posts(query){
		let statement = this.db.prepare("SELECT posts.id,title,name AS author,date FROM posts JOIN users ON users.id = posts.author WHERE title LIKE ? LIMIT 10");
		return statement.all("%" + query + "%");
	}
	create_post(title,content,author){
		let unix_time = (new Date()).getTime();
		let statement = this.db.prepare("INSERT INTO posts (title,author,content,date) VALUES (?,?,?,?)");
		return statement.run(title,content,author,unix_time);
	}
	get_post_meta(post_id,key){
		let statement = this.db.prepare("SELECT value FROM posts_meta WHERE post_id = ? AND key = ?");
		return statement.get(post_id,key);
	}
	set_post_meta(post_id,key,value){
		let l = get_post_meta(post_id,key);
		if(l === undefined){
			// insert
			let statement = this.db.prepare("INSERT INTO posts_meta (post_id,key,value) VALUES (?,?,?)");
			return statement.run(post_id,key,value);
		}else{
			// update
			let statement = this.db.prepare("UPDATE posts_meta SET value = ? WHERE post_id = ? AND key = ?");
			return statement.run(value,post_id,key);
		}
	}
	list_post_meta(post_id){
		let statement = this.db.prepare("SELECT key FROM posts_meta WHERE post_id = ?");
		return statement.get(post_id);
	}
	get_post(id){
		let statement = this.db.prepare(
			`SELECT posts.id,title,date,content,name AS author,author AS author_id 
			FROM posts JOIN users ON users.id = posts.author WHERE posts.id = ?`);
		return statement.get(id);
	}
	delete_post(id){
		let statement = this.db.prepare("DELETE FROM posts WHERE id = ?");
		return statement.run(id);
	}
	get_user(id){
		let statement = this.db.prepare("SELECT * FROM users WHERE id = ?");
		return statement.get(id);
	}
	create_user(id,name,rights){
		let statement = this.db.prepare("INSERT INTO users (id,name,rights) VALUES (?,?,?)");
		return statement.run(id,name,rights);
	}
}

module.exports = Blog;