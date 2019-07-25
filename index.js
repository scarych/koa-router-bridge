'use strict';

module.exports = function (Router) {

    // koa-router bridge: allows to build easy hierarchical routes structure with completely links between partitions  
    Router.prototype.bridge = function(p1, p2, p3) {
        var prefix;
        var bridge;
        var cb    ;
        // parse the arguments: define prefix, bridge and callback
        // prefix and bridge is not nessessary both, but one them must be defined 
        if (p3){
            prefix = p1;
            bridge = p2;
            cb     = p3;
            if (!bridge) throw new Error('Bridge is null');
        } else {
            if (typeof p1 == 'string'){
                prefix = p1;
            } else {
                bridge = p1;
                if (!bridge) throw new Error('Bridge is null');
            };
            cb = p2;
        };
        // create new inner router, set prefix and bridge if defined
        var nextRouter = new Router();    
        if (prefix) nextRouter.prefix(prefix);
        if (bridge) nextRouter.use('/', bridge);
        // accept callback for created router
        cb(nextRouter);
        // merge current router with new
        this.use('', nextRouter.routes(), nextRouter.allowedMethods());
    }
    return Router;
};