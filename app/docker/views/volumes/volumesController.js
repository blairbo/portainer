import angular from 'angular';

angular.module('portainer.docker')
.controller('VolumesController', ['$q', '$scope', '$state', 'VolumeService', 'ServiceService', 'VolumeHelper', 'Notifications', 'HttpRequestHelper', 'EndpointProvider',
function ($q, $scope, $state, VolumeService, ServiceService, VolumeHelper, Notifications, HttpRequestHelper, EndpointProvider) {

  $scope.removeAction = function (selectedItems) {
    var actionCount = selectedItems.length;
    angular.forEach(selectedItems, function (volume) {
      HttpRequestHelper.setPortainerAgentTargetHeader(volume.NodeName);
      VolumeService.remove(volume)
      .then(function success() {
        Notifications.success('Volume successfully removed', volume.Id);
        var index = $scope.volumes.indexOf(volume);
        $scope.volumes.splice(index, 1);
      })
      .catch(function error(err) {
        Notifications.error('Failure', err, 'Unable to remove volume');
      })
      .finally(function final() {
        --actionCount;
        if (actionCount === 0) {
          $state.reload();
        }
      });
    });
  };

  $scope.offlineMode = false;

  function initView() {
    var endpointProvider = $scope.applicationState.endpoint.mode.provider;
    var endpointRole = $scope.applicationState.endpoint.mode.role;

    $q.all({
      attached: VolumeService.volumes({ filters: { 'dangling': ['false'] } }),
      dangling: VolumeService.volumes({ filters: { 'dangling': ['true'] } }),
      services: endpointProvider === 'DOCKER_SWARM_MODE' && endpointRole === 'MANAGER' ? ServiceService.services() : []
    })
    .then(function success(data) {
      var services = data.services;
      $scope.offlineMode = EndpointProvider.offlineMode();
      $scope.volumes = data.attached.map(function(volume) {
        volume.dangling = false;
        return volume;
      }).concat(data.dangling.map(function(volume) {
        volume.dangling = true;
        if (VolumeHelper.isVolumeUsedByAService(volume, services)) {
          volume.dangling = false;
        }
        return volume;
      }));
    }).catch(function error(err) {
      Notifications.error('Failure', err, 'Unable to retrieve volumes');
    });
  }

  initView();
}]);
