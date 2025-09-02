// assets/js/router.js
(function (global){
  function getQuery(){
    const out = {};
    const usp = new URLSearchParams(window.location.search);
    usp.forEach((v,k)=>{ out[k]=v; });
    return out;
  }
  function toQuery(obj){
    const usp = new URLSearchParams();
    Object.entries(obj).forEach(([k,v])=>{
      if (v !== undefined && v !== null) usp.set(k, String(v));
    });
    return usp.toString();
  }
  function go(path, params){
    const q = params ? ('?' + toQuery(params)) : '';
    window.location.href = path + q;
  }
  global.Router = { getQuery, toQuery, go };
})(window);
