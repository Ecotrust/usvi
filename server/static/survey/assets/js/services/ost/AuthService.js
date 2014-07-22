angular.module('askApp')
    .factory( 'AuthService', ['$http', function($http) {
  var user = null;


  function login( data ) { 
    /*
    Inputs:
        data : object with keywords username, password
    */
    var url = "/account/authenticateUser";
    

    $http.post(url, data).success(function(data, status){
        user = data;
        console.log(user)
    }).error(function(data, status){

    });
  }
  
  function logout() {

  }



  return {
      login:login,
      user:user
  };
}]);