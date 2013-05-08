/*jshint strict:true, es5:true, forin:true, noarg:true, noempty:true, eqeqeq:true, bitwise:true, strict:true, undef:true, unused:true, nonew:true, browser:true, devel:true, indent:2, boss:true, curly:false, immed:false, latedef:true, newcap:true, plusplus:false, trailing:true, maxparams:4, maxerr:100, debug:false, asi:false, evil:false, expr:true, eqnull:false, esnext:false, funcscope:false, globalstrict:false, loopfunc:false */
(function(){
  "use strict";
  window.fixZoom = function(pageWidth,pageHeight,px,py){
    var
      prefix='',
      iv = 0,
      vendors = {Webkit: 'webkit', Moz: '', O: 'o', ms: 'MS' },
      testEl = document.createElement('div'),

      each = function(elements, callback){
        for (var key in elements)
          if (callback.call(elements[key], key, elements[key]) === false) return elements;
        return elements;
      },

      winZoom = function(){
        var paddingX = px || 0,
          paddingY = py || 0,
          winHeight  = winHeight || window.innerHeight,
          winWidth  = winWidth || window.innerWidth,
          container = document.querySelector('.container'),
          scalex = Math.floor((winHeight-paddingY)/pageHeight*1000)/1000,
          scaley = Math.floor((winWidth-paddingX)/pageWidth*1000)/1000,
          scale = Math.min(scalex,scaley),
          top = Math.round((winHeight-pageHeight*scale)),
          left = Math.round((winWidth-pageWidth*scale)/2);
        left = left>0 ? left : 0;
        container.style.position  = 'fixed';
        container.style.left = left + 'px';
        container.style.top = top + 'px';
        container.style[prefix+'TransformOrigin']= "0 0";
        container.style[prefix+'Transform'] = 'scale('+scale+')';
      },

      resize=function(){
        if(iv) clearTimeout(iv);
        iv = setTimeout(winZoom,300);
      },

      init = function(){
        each(vendors, function(vendor){
          if (testEl.style[vendor + 'TransitionProperty'] !== undefined) {
            prefix = vendor;
            return false;
          }
        });

        window.onresize = resize;

        winZoom();
      };

    window.onresize === resize ||  init();
  };
})();