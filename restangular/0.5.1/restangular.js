/**
 * Restfull Resources service for AngularJS apps
 * @version v0.5.1 - 2013-04-20
 * @link https://github.com/mgonto/restangular
 * @author Martin Gontovnikas <martin@gonto.com.ar>
 * @license MIT License, http://www.opensource.org/licenses/MIT
 */
var module = angular.module('restangular', ['ngResource']);

module.provider('Restangular', function() {
        // Configuration
        /**
         * Those are HTTP safe methods for which there is no need to pass any data with the request.
         */
        var safeMethods= ["get", "head", "options", "trace"];
        function isSafe(operation) {
          return _.contains(safeMethods, operation);
        }
        /**
         * This is the BaseURL to be used with Restangular
         */
        var baseUrl = "";
        this.setBaseUrl = function(newBaseUrl) {
            baseUrl = newBaseUrl;
        }
        
        /**
         * Sets the extra fields to keep from the parents
         */
        var extraFields = [];
        this.setExtraFields = function(newExtraFields) {
            extraFields = newExtraFields;
        }
        
        /**
         * Sets the URL creator type. For now, only Path is created. In the future we'll have queryParams
        **/
        var urlCreator = "path";
        this.setUrlCreator = function(name) {
            if (!_.has(urlCreatorFactory, name)) {
                throw new Error("URL Path selected isn't valid");
            }
            urlCreator = name;
        }
        
        /**
         * You can set the restangular fields here. The 3 required fields for Restangular are:
         * 
         * id: Id of the element
         * route: name of the route of this element
         * parentResource: the reference to the parent resource
         * 
         *  All of this fields except for id, are handled (and created) by Restangular. By default, 
         *  the field values will be id, route and parentResource respectively
         */
        var restangularFields = {
            id: "id",
            route: "route",
            parentResource: "parentResource",
            restangularCollection: "restangularCollection",
            what: "restangularWhat"
        }
        this.setRestangularFields = function(resFields) {
            restangularFields = _.extend(restangularFields, resFields);
        }
        
        /**
         * Sets the Response parser. This is used in case your response isn't directly the data.
         * For example if you have a response like {meta: {'meta'}, data: {name: 'Gonto'}}
         * you can extract this data which is the one that needs wrapping
         *
         * The ResponseExtractor is a function that receives the response and the method executed.
         */
        var responseExtractor = function(response, method) {
            return response;
        }
        this.setResponseExtractor = function(extractor) {
            responseExtractor = extractor;
        }
        
        /**
         * Sets the getList type. The getList returns an Array most of the time as it's a collection of values.
         * However, sometimes you have metadata and in that cases, the getList ISN'T an array.
         * By default, it's going to be set as array
         */
        var listTypeIsArray = true;
        this.setListTypeIsArray = function(val) {
            listTypeIsArray = val;
        };
        
        /**
         * This lets you set a suffix to every request.
         * 
         * For example, if your api requires that for JSon requests you do /users/123.json, you can set that
         * in here.
         * 
         * 
         * By default, the suffix is null
         */
        var suffix = null;
        this.setRequestSuffix = function(newSuffix) {
            suffix = newSuffix;
        }
        //Internal values and functions
        var urlCreatorFactory = {};
        
        /**
         * This is the Path URL creator. It uses Path to show Hierarchy in the Rest API.
         * This means that if you have an Account that then has a set of Buildings, a URL to a building
         * would be /accounts/123/buildings/456
        **/
        var Path = function() {
        }
        
        Path.prototype.base = function(current) {
            return baseUrl + _.reduce(this.parentsArray(current), function(acum, elem) {
                var currUrl = acum + "/" + elem[restangularFields.route];
                
                if (!elem[restangularFields.restangularCollection]) {
                    currUrl += "/" + elem[restangularFields.id];
                }
                
                return currUrl;
            }, '');
        }
        
        Path.prototype.parentsArray = function(current) {
            var parents = [];
            while(!_.isUndefined(current)) {
                parents.push(current);
                current = current[restangularFields.parentResource];
            }
            return parents.reverse();
        }
        
        Path.prototype.fetchUrl = function(what, current) {
            return this.base(current) + "/" + what.toLowerCase();
        }
        
        Path.prototype.resource = function(current, $resource, headers) {
            var reqParams = suffix ? {restangularSuffix: suffix} : {};
            return $resource(this.base(current) + "/:" + restangularFields.what + ":restangularSuffix" , {}, {
                getList: {method: 'GET', params: reqParams, isArray: listTypeIsArray, headers: headers || {}},
                get: {method: 'GET', params: reqParams, isArray: false, headers: headers || {}},
                put: {method: 'PUT', params: reqParams, isArray: false, headers: headers || {}},
                post: {method: 'POST', params: reqParams, isArray: false, headers: headers || {}},
                remove: {method: 'DELETE', params: reqParams, isArray: false, headers: headers || {}},
                head: {method: 'HEAD', params: reqParams, isArray: false, headers: headers || {}},
                trace: {method: 'TRACE', params: reqParams, isArray: false, headers: headers || {}},
                options: {method: 'OPTIONS', params: reqParams, isArray: false, headers: headers || {}},
                patch: {method: 'PATCH', params: reqParams, isArray: false, headers: headers || {}}
            });
        }
        
        urlCreatorFactory.path = Path;
        
        
        
       this.$get = ['$resource', '$q', function($resource, $q) {
          var urlHandler = new urlCreatorFactory[urlCreator]();
          
          function restangularizeBase(parent, elem, route) {
              elem[restangularFields.route] = route;
              
              if (parent) {
                  var restangularFieldsForParent = _.chain(restangularFields)
                          .pick(['id', 'route', 'parentResource'])
                          .values()
                          .union(extraFields)
                          .value();
                  elem[restangularFields.parentResource]= _.pick(parent, restangularFieldsForParent);
              }
              return elem;
          }
          
          function addCustomOperation(elem) {
              elem.customOperation = _.bind(customFunction, elem);
              _.each(["put", "post", "get", "delete"], function(oper) {
                  var name = "custom" + oper.toUpperCase();
                  elem[name] = _.bind(customFunction, elem, oper);
              });
              elem.customGETLIST = _.bind(fetchFunction, elem);
          }
          
          function restangularizeElem(parent, elem, route) {
              var localElem = restangularizeBase(parent, elem, route);
              localElem[restangularFields.restangularCollection] = false;
              localElem.get = _.bind(getFunction, localElem);
              localElem.getList = _.bind(fetchFunction, localElem);
              localElem.put = _.bind(putFunction, localElem);
              localElem.post = _.bind(postFunction, localElem);
              localElem.remove = _.bind(deleteFunction, localElem);
              localElem.head = _.bind(headFunction, localElem);
              localElem.trace = _.bind(traceFunction, localElem);
              localElem.options = _.bind(optionsFunction, localElem);
              localElem.patch = _.bind(patchFunction, localElem);
              addCustomOperation(elem);
              return localElem;
          }
          
          function restangularizeCollection(parent, elem, route) {
              var localElem = restangularizeBase(parent, elem, route);
              localElem[restangularFields.restangularCollection] = true;
              localElem.post = _.bind(postFunction, localElem, null);
              localElem.head = _.bind(headFunction, localElem);
              localElem.trace = _.bind(traceFunction, localElem);
              localElem.options = _.bind(optionsFunction, localElem);
              localElem.patch = _.bind(patchFunction, localElem);
              localElem.getList = _.bind(fetchFunction, localElem, null);
              addCustomOperation(elem);
              return localElem;
          }
          
          function whatObject(what) {
              var search = {};
              if (what) {
                  search[restangularFields.what] = what;
              }
              return search;
          }
          
          
          function fetchFunction(what, params, headers) {
              var search = whatObject(what);
              var __this = this;
              var deferred = $q.defer();
              
              urlHandler.resource(this, $resource, headers).getList(_.extend(search, params), function(resData) {
                  var data = responseExtractor(resData, 'getList');
                  var processedData = _.map(data, function(elem) {
                      if (!__this[restangularFields.restangularCollection]) {
                          return restangularizeElem(__this, elem, what);
                      } else {
                          return restangularizeElem(null, elem, __this[restangularFields.route]);
                      }
                      
                  });
                  if (!__this[restangularFields.restangularCollection]) {
                      deferred.resolve(restangularizeCollection(__this, processedData, what));
                  } else {
                      deferred.resolve(restangularizeCollection(null, processedData, __this[restangularFields.route]));
                  }
              }, function error() {
                  deferred.reject(arguments)
              });
              
              return deferred.promise;
          }
          
          function elemFunction(operation, params, obj, headers) {
              var __this = this;
              var deferred = $q.defer();
              var resParams = params || {};
              var resObj = obj || this;
              
              var okCallback = function(resData) {
                  var elem = responseExtractor(resData, operation) || resObj;
                  if (operation === "post" && !__this[restangularFields.restangularCollection]) {
                    deferred.resolve(restangularizeElem(__this, elem, resParams[restangularFields.what]));
                  } else {
                    deferred.resolve(restangularizeElem(__this[restangularFields.parentResource], elem, __this[restangularFields.route]));
                  }

              };
              
              var errorCallback = function() {
                  deferred.reject(arguments)
              };

              if (isSafe(operation)) {
                  urlHandler.resource(this, $resource, headers)[operation](resParams, okCallback, errorCallback);
              } else {
                  urlHandler.resource(this, $resource, headers)[operation](resParams, resObj, okCallback, errorCallback);
              }
              
              return deferred.promise;
          }
          
          function getFunction(params, headers) {
              return _.bind(elemFunction, this)("get", params, undefined, headers);
          }
          
          function deleteFunction(params, headers) {
              return _.bind(elemFunction, this)("remove", params, {}, headers);
          }
          
          function putFunction(params, headers) {
              return _.bind(elemFunction, this)("put", params, undefined, headers);
          }

          function postFunction(what, elem, params, headers) {
              return _.bind(elemFunction, this)("post", _.extend(whatObject(what), params), elem, headers);
          }

         function headFunction(params, headers) {
           return _.bind(elemFunction, this)("head", params, undefined, headers);
         }

         function traceFunction(params, headers) {
           return _.bind(elemFunction, this)("trace", params, undefined, headers);
         }

         function optionsFunction(params, headers) {
           return _.bind(elemFunction, this)("options", params, undefined, headers);
         }

         function patchFunction(params, headers) {
           return _.bind(elemFunction, this)("patch", params, undefined, headers);
         }
         
         function customFunction(operation, path, params, headers, elem) {
             return _.bind(elemFunction, this)(operation, _.extend(whatObject(path), params), elem, headers);
         }
          
          
          var service = {};
          
          service.one = function(route, id) {
              var elem = {};
              elem[restangularFields.id] = id;
              return restangularizeElem(null, elem , route);
          }
          
          service.all = function(route) {
              return restangularizeCollection(null, {} , route, true);
          }
          
          return service;
       
        }];
    }
);

