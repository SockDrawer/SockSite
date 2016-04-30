'use strict';
var request = require('request'),
    async = require('async');
var error = {
        url: '',
        avatar: '/avatar/ServerCooties',
        author: 'ServerCooties',
        body: '<p>+++Error At Address: 14, Treacle Mine Road, Ankh-Morpork+++' +
            '<br/>+++Divide By Cucumber Error. Please Reinstall Universe And' +
            ' Reboot +++</p>',
        name: '',
        authorTitle: ''
    },
    avatars = {},
    definitions = [error],
    users = {},
    host = 'https://what.thedailywtf.com';
request = request.defaults({
    rejectUnauthorized: false
});

function getAvatarPath(username, callback) {
    request(host + '/users/' + username + '.json', function (err, _, body) {
        var letter = '/letter_avatar/' + username +
            '/45/3_af0dc75e546be11ab6c09c8b9d61c787.png';
        if (err) {
            return callback(null, letter);
        }
        try {
            body = JSON.parse(body);
            if (!body.user.avatar_template) {
                return callback(null, letter);
            }

            callback(null, body.user.avatar_template.replace('{size}', '45'));
        } catch (__) {
            callback(null, letter);
        }
    });
}

function getAvatar(username, callback) {
    getAvatarPath(username, function (_, path) {
        var req = request(host + path),
            parts = [],
            res;
        req.on('error', callback);
        req.on('data', function (d) {
            parts.push(d);
        });
        req.on('response', function (resp) {
            res = resp;
        });
        req.on('end', function () {
            callback(null, {
                retrievedAt: Date.now(),
                contentType: res.headers['content-type'],
                lastModified: res.headers['last-modified'],
                data: Buffer.concat(parts)
            });
        });
    });
}

function serve(avatar, response) {
    response.writeHead(200, {
        'Content-Type': avatar.contentType,
        'Last-Modified': avatar.lastModified
    });
    response.write(avatar.data, 'binary');
    response.end();
}

exports.serveAvatar = function serveAvatar(uri, _, response) {
    var username = /[/]([^/]+)$/.exec(uri)[1];
    if (avatars[username]) {
        return serve(avatars[username], response);
    }
    getAvatar(username, function (err, avatar) {
        if (err) {
            response.writeHead(500);
            response.write("Avatar Not Loaded!", 'binary');
            return response.end();
        }
        avatars[username] = avatar;
        serve(avatar, response);
    });
};


function getPosts(id, complete) {
    var base = '/t/' + id + '/posts.json?include_raw=1';
    request(host + base + '&post_ids=0', function (err, _, topic) {
        var posts, results = [];
        try {
            posts = JSON.parse(topic).post_stream.stream;
        } catch (e) {
            err = e;
        }
        if (err) {
            return complete([]);
        }
        async.whilst(function () {
            return posts.length > 0;
        }, function (next) {
            var part = [];
            while (part.length < 100 && posts.length > 0) {
                part.push(posts.shift());
            }
            part = part.join('&post_ids[]=');
            request(host + base + '&post_ids[]=' + part,
                function (err2, resp, defs) {
                    if (err2 || resp.statusCode !== 200) {
                        return next();
                    }
                    try {
                        defs = JSON.parse(defs).post_stream.posts;
                    } catch (e) {
                        return next(e);
                    }
                    results = results.concat(defs.filter(function (f) {
                        return f.wiki && f.post_number > 1;
                    }).map(function (post) {
                        return {
                            url: host + '/p/' + post.id,
                            avatar: '/avatar/' + post.username,
                            author: post.username,
                            body: post.cooked,
                            name: post.name,
                            authorTitle: post.user_title
                        };
                    }));
                    setTimeout(next, 1000);
                });
        }, function () {
            complete(results);
        });
    });
}

function loadDefinitions(callback) {
    getPosts(3866, function (defs) {
        definitions = defs || [error];
        var usr = definitions.map(function (d) {
            return d.author;
        });
        usr.push('ServerCooties');
        users = {};
        usr.forEach(function (u) {
            users[u] = users[u] ? users[u] + 1 : 1;
        });
        callback();
    });
}

exports.getQuote = function getQuote() {
    var def = definitions[Math.floor(Math.random() * definitions.length)];
    def.body = def.body.replace(/(src|href)="([^"]+)"/g,
        function (_, prefix, value) {
            if (value.substr(0, 2) === '//') {
                value = 'https:' + value;
            }
            if (value[0] === '/') {
                value = host + value;
            }
            return prefix + '="' + value + '"';
        });
    return def;
};



if (!process.env.SOCKDEV || process.env.SOCKQUOTES) {
    async.forever(function (next) {
        var refresh = 5 * 60 * 60 * 1000;
        loadDefinitions(function () {
            console.log('quotes loaded'); //eslint-disable-line no-console
            var now = Date.now() - refresh;
            async.each(Object.keys(users), function (user, innerNext) {
                if (!avatars[user] || avatars[user].retrievedAt < now) {
                    return getAvatar(user, function (err, avatar) {
                        if (!err) {
                            avatars[user] = avatar;
                        }
                        setTimeout(innerNext, 3 * 1000);
                    });
                }
                innerNext();
            });
            setTimeout(next, refresh);
        });
    });
}

async.forever(function (next) {
    var cutoff = Date.now() - 10 * 60 * 1000;
    Object.keys(avatars).forEach(function (key) {
        if (!users[key] && avatars[key].retrievedAt < cutoff) {
            delete users[key];
        }
    });
    setTimeout(next, 60 * 1000);
});
