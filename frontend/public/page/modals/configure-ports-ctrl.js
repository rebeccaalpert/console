angular.module('app')
.controller('ConfigurePortsCtrl', function(_, $scope, $rootScope, $controller,
      $modalInstance, container, PodsSvc) {
  'use strict';

  $scope.rowMgr = $controller('RowMgr', {
    $scope: $rootScope.$new(),
    emptyCheck: function(p) {
      return _.isNull(p.hostPort) || _.isNull(p.containerPort) || _.isEmpty(p.name);
    },
    getEmptyItem: PodsSvc.getEmptyPort,
  });

  $scope.initPorts = function(ports) {
    if (_.isEmpty(ports)) {
      $scope.rowMgr.setItems([]);
    } else {
      $scope.rowMgr.setItems(angular.copy(ports));
    }
  };

  $scope.save = function() {
    container.ports = $scope.rowMgr.getNonEmptyItems();
    $modalInstance.close(container);
  };

  $scope.cancel = function() {
    $modalInstance.dismiss('cancel');
  };

  $scope.initPorts(container.ports);
})
.controller('ConfigurePortsFormCtrl', function($scope) {
  $scope.submit = $scope.save;
});
