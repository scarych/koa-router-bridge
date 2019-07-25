## Koa router bridge: easy way to make bridges for routes.
This plugin extends standart Koa router and allow to make simple and clean constructions to provide nested routes.

**Usage**:

```js    
import bridgeRouter from 'koa-router-bridge';   //-- import the module
import koaRouter from 'koa-router';   // import standart koa-router
let bridgedRouter = new bridgeRouter(koaRouter);   // patch the koa-router
// make new router
let router = new bridgedRouter();   
```    

Now we have standart router with bridge extension. This is very helpful to define complete routes structure with using different middleware checks, nested structures and other. Let use it!

```js
// get our routes structure (would be explained later)
import routes from './app/routes';  
// set some uses
router.use(async (ctx, next)=> {
    ctx.router = router;    //-- why not? ;)
    await next();
})

//-- let bridge it!
router.bridge(routes.init, (router) => {    // first use: cover all futher requests with specific init 
    //-- router is standart koa-router object everywhere and has every koa-router methods, plus .bridge(..)
    router.get('/', routes.index);

    router.bridge('/blog', [routes.blog.init], (router) => { //-- list of routes is allowed too!
        router.get('/', routes.blog.index);
        //-- request url is /blog/:blogId
        router.bridge('/:blodId', routes.blog.checkId, (router) => {
            router.get('blogView', '/', router.blog.view);
            // easy way to  determine different output formats
            router.get('.json', router.blog.itemJson);  // /blog/:blogId.json
            router.get('.xml', router.blog.itemXML);    // /blog/:blogId.xml
            router.get('.html', router.blog.itemHTML);  // /blog/:blogId.html
            //-- request url is /blog/:blogId/comments
            router.bridge('/comments', (router) => {
                router.get('postComments', '/', router.blog.comments); //-- store url for router.url('postComments');
                router.post('/add', router.blog.addComment);
            });
        });
    });

    /**
    Every nested request is protected by chain of middleware routes
    Keep your API in safety! 
    */

    router.bridge('/shop', routes.shop.init, (router) => {
        router.get('/', routes.shop.index);
        router.bridge('/:itemId', routes.shop.checkItem, (router) => {
            //-- request url is /shop/:itemId
            router.get('/', routes.shop.viewItem);
            //-- request url is /shop/:itemId/order
            router.post('/order', routes.shop.orderItem);
        });
    });
});

/** attach complete router to your Koa app */ 
app.use(router.routes()).use(router.allowedMethods());
```

Job complete! Now your router has complete path definitions for every nested elements, and for each of them will be executed necessary chains of conditions, data setting and other preparations. 

Everything depends on routes functions. Let's explain them.

**./app/routes.js**

```js
let router = {
    /** for koa 1.* allowed generators and yield */
    /** for example the base middleware must check for trailing slash into url */
    init : async (ctx, next) => {
        let url = ctx.req._parsedUrl;
        let pathname = url.pathname;
        var checkExt = /.*[\.(xml|html|json)]$/; // requests with extensions must been skipped
        if (pathname.search(checkExt)<0 && pathname.substr(-1)!=='/') {
            ctx.redirect((pathname+'/')+(url.search||''));
            return;
        }
        //-- add some through object e.g. 
        ctx.$$ = {};
        //-- then go deeper
        await next();
    },
    // index router, just render index template
    index: async (ctx, next) => {
        await ctx.render('index', {});
    },
    // let init blog section
    blog: {
        // init function must prepare some object for futher usage
        init: async (ctx, next) => {
            //--  store Blog for next usage
            ctx.$$.Blog = new Blog();
            await next();
        },
        // then we can use this object for specific actions
        index: async (ctx, next) => {
            let data = await ctx.$$.Blog.getList({...});
            await ctx.render ('blog/index', {... data ...});
        },
        // middleware before every request for /blog/:blogId 
        checkId: async (ctx, next) => {
            var blogItem = await ctx.$$.Blog.getItem(ctx.params.blogId);
            if (blogItem) {
                ctx.$$.blogItem = blogItem;
                await next();
            } else {
                ctx.throw (404);
            }
        },
        // viewItem would been executed if only `checkId` returns next();
        viewItem: async (ctx, next) => {
            await ctx.render('blog/item', {item: ctx.$$.blogItem, url: ctx.router.url('blogView', ctx.params)});
        },
        // the same for every specific output format
        itemJSON: async (ctx. next) => {
            ctx.json(ctx.$$.blogItem);
        },
        //... other code 
    },

    //-- same methods for shop init
    shop: {
        init: async (ctx, next) => {
            ctx.$$.Shop = new Shop();
            await next();
        },
        //... code for other methods 
    },
    // also we can require some extensions from other files
    other: require ('./other'),
}
// export our router
module.exports = router;
```

Also we can import routes functions from specific files or write code right into router. This is not forbidden :)

```js
import blogRoutes from './Routes/blog';
import shopRoutes from './Routes/shop';
/** ... */
router.bridge('/blog', blogRoutes.prepare, (router)=> {
    router.get('/', blogRoutes.index);
    router.bridge('/:blogId', blogRoutes.check, (router) => {
        router.get('/', blogRouter.view);
        router.post('/save', blogRouter.save);
    });
});
/** ... */
router.bridge('/shop', shopRoutes.prepare, (router) => {
    // ...
});
// write the code into bridges 
router.bridge('/user', async (ctx, next) => { console.log ('do users preparation'); await next(); }, (router) => { 
    router.get('/', async(ctx, next) => { ctx.render('users/index', {} });
});
```

#### P.S.:
**koa-router-bridge** may have some magic with [roudex](https://www.npmjs.com/package/roudex) ;)
