angular.module('askApp')
    .factory( 'AuthService', ['$http', function($http) {
  var user = null;


  function login(data, success_callback, error_callback) { 
    /*
    Inputs:
        data : object with keywords username, password
    */
    var url = "/account/authenticateUser";
    $http.post(url, data).success(function(data, status){
        user = data;
        console.log("In post")
        
        success_callback(data, status);
    }).error(function(data, status){
        error_callback(data, status)
    });
  }
  
  function logout() {

  }



  return {
      login:login,
      user:user
  };
}]);