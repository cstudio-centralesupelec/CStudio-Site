/*
This is a general purpose library to create blogs.

It implements all the sql stuff you need to have:
- blog posts
- user system
- likes
- comments
- added metadata if needed

*/
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

		this.db.exec(`CREATE TABLE IF NOT EXISTS post_comments (
			id INTEGER PRIMARY KEY,
			post_id INTEGER,
			user_id INTEGER,
			content TEXT NOT NULL,

			FOREIGN KEY (post_id)
				REFERENCES posts (id) 
					ON DELETE CASCADE 
					ON UPDATE NO ACTION,
			FOREIGN KEY (user_id)
				REFERENCES users (id)
					ON DELETE CASCADE
					ON UPDATE NO ACTION
		);`);

		this.db.exec(`CREATE TABLE IF NOT EXISTS post_likes (
			post_id INTEGER,
			user_id INTEGER,

			PRIMARY KEY (post_id,user_id),
			FOREIGN KEY (post_id)
				REFERENCES posts (id) 
					ON DELETE CASCADE 
					ON UPDATE NO ACTION,
			FOREIGN KEY (user_id)
				REFERENCES users (id)
					ON DELETE CASCADE
					ON UPDATE NO ACTION
		);`);

	}
	recent_posts(limit,offset,options){
		// options can be used to retreive posts with specific metadata
		let sqlQuery = `SELECT posts.id,title,name AS author,date,SUBSTR(content,0,80) AS preview
			FROM posts JOIN users ON users.id = posts.author ORDER BY date LIMIT ? OFFSET ?`;
		let args = [limit,offset];
		if(options){
			/*
				options = {
					key = val
				};
			*/
			sqlQuery = `SELECT posts.id,title,name AS author,date,SUBSTR(content,0,80) AS preview
			FROM posts JOIN users ON users.id = posts.author JOIN posts_meta ON posts.id = post_id WHERE `;
			let isFirst = true;
			for(let key in options){
				sqlQuery += "posts_meta.key = ? AND posts_meta.value = ? ";
				args.push(key);
				args.push(options[key]);
				if(!isFirst){
					sqlQuery += "AND ";
				}
				isFirst = false;
			}
		}
		//console.log(sqlQuery,args);
		let statement = this.db.prepare(sqlQuery);
		let result = statement.all.apply(statement,args);
		return result;
	}
	search_posts(query,options){
		// options can be used to retreive posts with specific metadata
		let statement = this.db.prepare(`SELECT posts.id,title,name AS author,date,SUBSTR(content,0,80) AS preview
			FROM posts JOIN users ON users.id = posts.author WHERE title LIKE ? ORDER BY date LIMIT 10`);
		return statement.all("%" + query + "%");
	}
	create_post(title,content,author,metadata){
		let unix_time = (new Date()).getTime();
		let statement = this.db.prepare("INSERT INTO posts (title,author,content,date) VALUES (?,?,?,?)");

		let result = statement.run(title,content,author,unix_time);
		let post_id = result.lastInsertRowid;

		if(metadata){
			for(let key in metadata){
				let statement = this.db.prepare("INSERT INTO posts (post_id,key,value) VALUES (?,?,?)");
				statement.run(post_id,key,metatdata[key]);
			}
		}
		return post_id;
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
	list_post_comments(post_id){
		// Also fetch username for convenience.
		// We return comment id because it's used to identify uniquely a comment for removal
		let statement = this.db.prepare(`SELECT post_comments.id,user_id,content,name
			FROM post_comments JOIN users ON users.id = user_id WHERE post_id = ?`);
		return statement.all(post_id);
	}
	add_comment(post_id,user_id,comment_content){
		let statement = this.db.prepare(`INSERT INTO post_comments (post_id,user_id,content) VALUES  (?,?,?)`);
		return statement.run(post_id,user_id,comment_content);
	}
	remove_comment(comment_id){
		let statement = this.db.prepare("DELETE FROM post_comments WHERE id = ?");
		return statement.run(comment_id);
	}

	get_post_likes(post_id){
		let statement = this.db.prepare(`SELECT COUNT(*) FROM post_likes WHERE post_id = ?`);
		return statement.get(post_id);
	}
	is_post_liked(post_id,user_id){
		let statement = this.db.prepare(`SELECT * FROM post_likes WHERE post_id = ? AND user_id = ?`);
		return statement.all(post_id,user_id).length >= 1; // because of primary key, this should be 1 at most.
	}
	change_like_post(post_id,user_id,state){ // used to like or unlike posts.
		let isLiked = is_post_liked(post_id,user_id);
		if(isLiked && !state){
			// unlike
			let statement = this.db.prepare(`DELETE FROM post_likes WHERE post_id = ? AND user_id = ?`);
			return statement.run(post_id,user_id);
		}else if(!isLiked && state){
			let statement = this.db.prepare(`INSERT INTO post_likes (post_id,user_id) VALUES  (?,?)`);
			return statement.run(post_id,user_id);
		}
		return undefined;
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
	upload_post_file(post_id,req){
		// upload a file associated to a post.
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