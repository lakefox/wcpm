"use strict";
// TODO: Offline Support
(() => {
  var devMode = false;
  var userSrc = {};
  var imports = document.querySelectorAll("link[rel='import']");
  for (var a = 0; a < imports.length; a++) {
    var href = imports[a].getAttribute("href");
    if (href.indexOf("wc:") != -1) {
      if (imports[a].getAttribute("mode") == "dev") {
        devMode = true;
      }
      var user = href.slice(href.indexOf("wc:")+3);
      userSrc[user] = {};
      var components = document.querySelectorAll(user);
      for (var b = 0; b < components.length; b++) {
        var src = components[b].getAttribute("src");
        userSrc[user][src] = null;
      }
    }
  }
  var req = {
    req: userSrc
  }

  if (devMode) {
    post("include", req).then((res) => {
      load(res);
    });
  } else {
    var id = hash(JSON.stringify(userSrc));

    if (localStorage.getItem(id) == null) {
      post("include", req).then(load);
    } else {
      load(JSON.parse(localStorage.getItem(id)));
      post("include", req).then((res) => {
        localStorage.setItem(id, JSON.stringify(res));
      });
    }
  }

  function load(res) {
    if (localStorage.getItem(id) == null && !devMode) {
      localStorage.setItem(id, JSON.stringify(res));
    }
    var jseval = "";

    for (var a = 0; a < imports.length; a++) {
      var href = imports[a].getAttribute("href");
      if (href.indexOf("wc:") != -1) {
        var user = href.slice(href.indexOf("wc:")+3);
        var components = document.querySelectorAll(user);
        for (var b = 0; b < components.length; b++) {
          var src = components[b].getAttribute("src");
          if (components[b].querySelector("args")) {
            var args = JSON.parse(components[b].querySelector("args").innerText.trim());
          }
          var dir = JSON.parse(res[user][src]);
          var packageXML = dir["package.xml"];
          var dom = new DOMParser().parseFromString(packageXML, "text/html");
          var index = dir[dom.querySelector("main").innerText];
          if (args) {
            Mustache.parse(index);
            var rendered = Mustache.render(index, args);
          } else {
            var rendered = index;
          }
          var dom = new DOMParser().parseFromString(rendered, "text/html");
          var links = dom.querySelectorAll("link");
          for (var c = 0; c < links.length; c++) {
            var href = links[c].href;
            // IF it is a css file
            if (href.indexOf(".css") != -1) {
              if (href.indexOf(window.location.origin) != -1) {
                href = href.slice(window.location.origin.length+1).split("/");
              } else {
                href = href.split("/")
              }
              var css = JSON.parse(JSON.stringify(dir));
              for (var d = 0; d < href.length; d++) {
                css = css[href[d]];
              }
              var style = document.createElement("style");
              style.innerHTML = css;
              dom.body.appendChild(style);
            }
          }
          var scripts = dom.querySelectorAll("script");
          for (var c = 0; c < scripts.length; c++) {
            var src = scripts[c].src;
            // IF it is a js file
            if (src.indexOf(".js") != -1) {
              if (src.indexOf(window.location.origin) != -1) {
                src = src.slice(window.location.origin.length+1).split("/");
                var js = JSON.parse(JSON.stringify(dir));
                for (var d = 0; d < src.length; d++) {
                  js = js[src[d]];
                }
                var script = document.createElement("script");
                var jsWargs = `
                (() => {
                  var args = `+JSON.stringify(args)+`;
                  `+js+`
                })();
                `;
                script.innerHTML = jsWargs
                scripts[c].outerHTML = script.outerHTML;
                jseval += jsWargs;
              }
            } else {
              jseval += `
              (() => {
                `+scripts[c].innerHTML+`
              })();
              `;
            }
          }
          components[b].innerHTML += dom.body.innerHTML;
        }
      }
    }
    try {
      eval(jseval);
    } catch (e) {
      console.error(e);
    }
  }

  var args = document.querySelectorAll("args");

  for (var i = 0; i < args.length; i++) {
    args[i].style.display = "none";
  }

  function post(name, value) {
    var url = 'http://localhost:8080/api';
    var data = {store: {}};
    data.store[name] = value;
    return new Promise(function (resolve, reject) {
      fetch(url, {
        method: 'POST',
        body: JSON.stringify(data),
        headers: {
          'Content-Type': 'application/json'
        }
      }).then((res) => {
        return res.json();
      }).then((data) => {
        resolve(JSON.parse(data.res));
      });
    });
  }

  function hash(s) {
    /* Simple hash function. */
    var a = 1, c = 0, h, o;
    if (s) {
        a = 0;
        /*jshint plusplus:false bitwise:false*/
        for (h = s.length - 1; h >= 0; h--) {
            o = s.charCodeAt(h);
            a = (a<<6&268435455) + o + (o<<14);
            c = a & 266338304;
            a = c!==0?a^c>>21:a;
        }
    }
    return String(a);
  };
})();
