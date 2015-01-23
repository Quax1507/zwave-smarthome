/**
 * Application factories
 * @author Martin Vach
 */
var myAppFactory = angular.module('myAppFactory', []);

/**
 * Caching the river...
 */
myAppFactory.factory('myCache', function($cacheFactory) {
    return $cacheFactory('myData');
});

/**
 * Main data factory
 */
myAppFactory.factory('dataFactory', function($http, $interval,$window,$filter,myCache, cfg) {
    var apiDataInterval;
    var enableCache = true;
    var updatedTime = Math.round(+new Date() / 1000);
    return({
        getApiData: getApiData,
        postApiData: postApiData,
        putApiData: putApiData,
        deleteApiData: deleteApiData,
        localData: localData,
        setCache: setCache,
        runCmd: runCmd,
        updateApiData: updateApiData,
        cancelApiDataInterval: cancelApiDataInterval,
        getLanguageFile: getLanguageFile,
         getZwaveApiData: getZwaveApiData,
         updateZwaveApiData: updateZwaveApiData,
         runZwaveCmd: runZwaveCmd
    });

    /// --- Public functions --- ///

    /**
     * Gets app local data
     */
    function localData(file, callback) {
        var request = {
            method: "get",
            url: cfg.local_data_url + file
        };
        return getApiHandle(callback, request, file);

    }

    /**
     * API data
     */
    // Get
    function getApiData(api, callback, params) {
        var request = {
            method: "get",
            url: cfg.server_url + cfg.api[api] + (params ? params : '')
        };
        return getApiHandle(callback, request, api + params);
    }

    // Post
    function postApiData(api, data, callback) {
        var request = {
            method: "post",
            data: data,
            url: cfg.server_url + cfg.api[api]
        };
        return storeApiHandle(callback, request);
    }

    // Put
    function putApiData(api, id, data, callback) {
        var request = {
            method: "put",
            data: data,
            url: cfg.server_url + cfg.api[api] + "/" + id
        };
        return storeApiHandle(callback, request);
    }

    // Delete
    function deleteApiData(api, id, target) {
        var request = {
            method: "delete",
            //data: data,
            url: cfg.server_url + cfg.api[api] + "/" + id
        };
        return deleteApiHandle(request, target);
    }

    /**
     * Run command
     */
    function runCmd(cmd) {
        var request = {
            method: "get",
            url: cfg.server_url + cfg.api_url + "devices/" + cmd
        };
        return $http(request).success(function(data) {
            console.log('SUCCESS:' + cfg.server_url + cfg.api_url + "devices/" + cmd);
        }).error(function(data, status, headers, config, statusText) {
            handleError(data, status, headers, config, statusText);

        });
    }


    /**
     * Get updated data from the api collection.
     */
    function  updateApiData(api,callback) {
        var refresh = function() {
            var request = {
                method: "get",
                //url:  cfg.demo_url + api + '.json',
                url: cfg.server_url + cfg.api[api] + '?since=' +  updatedTime
            };
            if($http.pendingRequests.length > 0){
                addErrorElement();
            }
            $http(request).success(function(data) {
                addTimeTickElement();
                updateTimeTick($filter('hasNode')(data,'data.updateTime'));
                return callback(data);
            }).error(function(data, status, headers, config, statusText) {
                handleError(data, status, headers, config, statusText);

            });
        };
        apiDataInterval = $interval(refresh, cfg.interval);
    }

    /**
     * Cancel data interval
     */
    function cancelApiDataInterval() {
        if (apiDataInterval) {
            $interval.cancel(apiDataInterval);
            apiDataInterval = undefined;
        }
        return;
    }

    /**
     * Load language file
     */
    function getLanguageFile(callback, lang) {
        var langFile = lang + '.json';
        var request = {
            method: "get",
            url: cfg.lang_dir + langFile
        };
        return getApiHandle(callback, request, langFile);
    }
    
    /**
     * Get ExpertUI data
     */
    function getZwaveApiData(callback) {
        var request = {
            method: "post",
            url: cfg.server_url + cfg.zwave_api_url  + 'Data/0'
        };
        return getApiHandle(callback, request);
    }
    
    /**
     * Get updated data from ExpertUI
     */
    function  updateZwaveApiData(callback) {
         var zTime = Math.round(+new Date() / 1000);
        var refresh = function() {
            var request = {
                method: "post",
                url: cfg.server_url + cfg.zwave_api_url  + 'Data/' + zTime
            };
            if($http.pendingRequests.length > 0){
                addErrorElement();
            }
            $http(request).success(function(data) {
                 zTime = data.updateTime;
                addTimeTickElement();
                updateTimeTick($filter('hasNode')(data,'data.updateTime'));
                return callback(data);
            }).error(function(data, status, headers, config, statusText) {
                handleError(data, status, headers, config, statusText);

            });
        };
        apiDataInterval = $interval(refresh, cfg.interval);
    }
    
    /**
     * Run ExpertUI command
     */
    function runZwaveCmd(cmd) {
        var request = {
            method: "get",
            url: cfg.server_url + cfg.zwave_api_url + "Run/" + cmd
        };
        return $http(request).success(function(data) {
            console.log('SUCCESS:' + request.url);
        }).error(function(data, status, headers, config, statusText) {
            handleError(data, status, headers, config, statusText);

        });
    }

    /// --- Private functions --- ///

    /**
     * Api handle
     */
    // GET
    function getApiHandle(callback, request, cacheName) {
        var cached = null;
        if (cacheName) {
            cached = myCache.get(cacheName);
        }
        // Cached data
        if (enableCache && cached) {
            console.log('CACHED: ' + cacheName);
            return callback(cached);
        } else {
            console.log('NOT CACHED: ' + cacheName);
            if($http.pendingRequests.length > 0){
                addErrorElement();
            }
            return $http(request).success(function(data) {
                addTimeTickElement();
                updateTimeTick($filter('hasNode')(data,'data.updateTime'));
                myCache.put(cacheName, data);
                return callback(data);
            }).error(function(data, status, headers, config, statusText) {
                handleError(data, status, headers, config, statusText);

            });
        }

    }
    // POST/PUT
    function storeApiHandle(callback, request) {
        //$('#respone_container').html('Loading').show();
        return $http(request).success(function(data) {
            return callback(data);
        }).error(function(data, status, headers, config, statusText) {
            handlePostError(data, status, headers, config, statusText);

        });
    }

    // Delete
    function deleteApiHandle(request, target) {
        return $http(request).success(function(data) {
            if (target) {
                $(target).fadeOut();
            }
        }).error(function(data, status, headers, config, statusText) {
            handleDeleteError(data, status, headers, config, statusText);
        });
    }


    /**
     * Handle errors
     */
    function handleError(data, status, headers, config, statusText) {
        var msg = 'Can`t receive data from the remote server';
       addErrorElement();
        //$('#main_content').html('<div class="alert alert-danger alert-dismissable response-message"><button type="button" class="close" data-dismiss="alert" aria-hidden="true">&times;</button> <i class="icon-ban-circle"></i> ' + msg + '</div>');
        //console.log(config);
        return;


    }

    function handlePostError(data, status, headers, config, statusText) {
        var msg = 'Can`t store data in the remote server';
       $window.alert(msg);
        console.log(config);
        return;


    }

    function handleDeleteError(data, status, headers, config, statusText) {
        var msg = 'Can`t delete data from the remote server';
        $window.alert(msg);
        console.log(config);
        return;


    }

    /**
     * Enable/Disable the cache
     */
    function setCache(enable) {
        enableCache = enable;
        return;
    }
     /**
     * Add add error element
     */
    function addErrorElement() {
         $('.navi-time').html('<i class="fa fa-minus-circle fa-lg text-danger"></i>');
    }
     /**
     * Add spinner
     */
    function addSpinnerElement() {
         $('.navi-time').html('<i class="fa fa-spinner fa-spin"></i>');
    }
    
    /**
     * Add time tick
     */
    function addTimeTickElement() {
         $('.navi-time').html('<i class="fa fa-clock-o"></i> <span id="update_time_tick"></span>');
    }
    
    /**
     * Update time tick
     */
    function updateTimeTick(time) {
        time = (time || Math.round(+new Date() / 1000));
        updatedTime = time;
        $('#update_time_tick').html($filter('getCurrentTime')(time));
    }

});
