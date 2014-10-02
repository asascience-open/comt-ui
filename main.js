var map;
var lyrQuery;
var mapDate;
var catalog = [];
var plotData = [];
var colorramps = [];
var prevPt;
var proj3857 = new OpenLayers.Projection("EPSG:3857");
var proj4326 = new OpenLayers.Projection("EPSG:4326");

var buttonClasses = [
   'primary'
  ,'success'
  ,'info'
  ,'warning'
  ,'danger'
  ,'dark-blue'
  ,'tan'
  ,'dark-green'
  ,'brown'
  ,'aqua'
  ,'dark-pink'
  ,'mustard'
];
var name2Color = {};

var lineColors = [
   ['#66C2A5','#1B9E77']
  ,['#FC8D62','#D95F02']
  ,['#8DA0CB','#7570B3']
  ,['#E78AC3','#E7298A']
  ,['#A6D854','#66A61E']
  ,['#FFD92F','#E6AB02']
  ,['#E5C494','#A6761D']
  ,['#B3B3B3','#666666']
];

var activeMapLayersTableOffset = 170;
var queryResultsFooterOffset = 40;

function resize() {
  var 	mapOffset 	= 103,
        activeMapLayersTableOffset = 170,
        timeSliderOffset = 150;
	sliderOffset = 50;
  $('#mapView').height($(window).height() - mapOffset - sliderOffset - timeSliderOffset);
  $('#results .table-wrapper').height($(window).height() - 216);
  $('#active-layers .table-wrapper').height($(window).height() - activeMapLayersTableOffset);
  $('#query-results_wrapper .dataTables_scrollBody').css('height',$(window).height() - activeMapLayersTableOffset - queryResultsFooterOffset);
  $('.dataTables_scrollBody').height(($(window).height() - 250));
  $('#query-results_wrapper .dataTables_scrollBody').css('overflow-x','hidden');
  fixCellWidth();
  map.updateSize();
  plot();
}

function fixCellWidth() {
  if (hasScrollBar($('#active-layers .table-wrapper')[0]))
    $('#active-layers table tbody td:last-child').css('width', '37px');
  else {
    $('#active-layers table tbody td:last-child').css('width', '54px');
    $('#active-layers .table-wrapper').css('height', 'auto');
  }
}

window.onresize = resize;

function categoryClick() {
  syncFilters($('#categories.btn-group input:checked').attr('id'));
  syncQueryResults();
}

function filterValueSelect() {
  var id = $(this).attr('id').replace('list','filter-btn');
  $('#' + id).addClass('active');
  // Give the button time to add its class (which is used for testing in the query).
  setTimeout(function() {
    syncQueryResults();
  },100);
}

function addToMap() {
  var c = catalog[$(this).data('idx')];
  var lyrName = $(this).data('name');
  var obs = false;
  var lc = 0;
  if (_.isEmpty(map.getLayersByName(c.name + '-' + lyrName))) {
    if (!mapDate) {
      mapDate = isoDateToDate(c.temporal[0]);
    }
    if (c.layers[lyrName] == 'OBSERVATION') {
      obs = true;
      lyrName = addObs({
         group    : c.name
        ,url      : c.url
        ,layers   : lyrName
        ,times    : c.temporal
        ,bbox     : new OpenLayers.Bounds(c.spatial).transform(proj4326,proj3857)
      });
    }
    else {
      lyrName = addWMS({
         group  : c.name
        ,url    : c.url
        ,layers : lyrName
        ,styles : c.layers[lyrName]
        ,times  : c.temporal
        ,bbox   : new OpenLayers.Bounds(c.spatial).transform(proj4326,proj3857)
      });
    }
    lc++;
  }

  if (lc > 0) {
    $('ul.nav li:last-child a').trigger('click');
    syncTimeSlider(c.temporal);

    var title = obs ? '' : 'title="<img src=\'' + getLayerLegend(lyrName) + '\' alt=\'\'>"';
    var t = '';
    // var t = '<span class="glyphicon glyphicon-time"></span><input type="text" name="timeStamp" value="Jun 1, 2005" disabled class="form-control">';
    var rowHtml = '<tr data-toggle="tooltip" data-placement="right" data-html="true" data-name="' + lyrName + '" ' + title + '><td><div><p title="' + lyrName + '">' + lyrName + '</p>' + t + '<a href="#" data-name="' + lyrName + '" data-toggle="modal" data-target="#layer-settings"><span class="glyphicon glyphicon-cog"></span><a href="#" title="Zoom To" data-name="' + lyrName + '"><span class="glyphicon glyphicon-zoom-in"></span><img src="./img/loading.gif"></a><a href="#" class="popover-link" data-toggle="popover" title="' + lyrName + '" data-html= "true"  data-name="' + lyrName + '" data-content="' + c.tSpan + '\n' + '<a target=\'_blank\' href=\'' + c.url + '\'>' + c.url + '</a>"><span class="glyphicon glyphicon-info-sign"></span></a></div></td>';
    rowHtml += '<td class="checkbox-cell"><input type="checkbox" checked value="' + lyrName + '" /></td>';
    $('#active-layers table tbody').append(rowHtml);
    $('#active-layers input:checkbox').off('click');
    $('#active-layers input:checkbox').click(function() { 
      toggleLayerVisibility($(this).val());
    });
    $('#active-layers a[title="Zoom To"]').off('click');
    $('#active-layers a[title="Zoom To"]').click(function() {
      zoomToLayer($(this).data('name'));
    });
    if (false) {
      $('#active-layers .table-wrapper table tbody tr td div span.glyphicon-time').addClass('red').attr('data-original-title','Over 3 day(s) old').tooltip('fixTitle');
    }
    else {
      $('#active-layers .table-wrapper table tbody tr td div span.glyphicon-time').removeClass('red').attr('data-original-title','').tooltip('fixTitle');
    }
    fixCellWidth();
  }
  else {
    alert('Oops.  This dataset is already on your map.');
  }
}

function hasScrollBar(div) {
    return (div.scrollHeight != div.clientHeight);
}

$(document).ready(function() {
  $('ul.nav li:first-child a').on('click', function(e){
    e.preventDefault();
    if ($(this).hasClass('active'))
      return false;
    else {
      $('#mapView, #map-view-col, #map-col').hide();
      $('#catalogue').show();
      $('li.active').removeClass('active');
      $(this).parent().addClass('active');
      resize();
    }
  });

  $('ul.nav li:last-child a').on('click', function(e){
    e.preventDefault();
    if ($(this).hasClass('active'))
      return false;
    else {
      $('#catalogue').hide();
      $('#mapView, #map-view-col, #map-col').show();
      $('li.active').removeClass('active');
      $(this).parent().addClass('active');
      resize();
    }
  });

  lyrQuery = new OpenLayers.Layer.Vector(
     'Query points'
    ,{styleMap : new OpenLayers.StyleMap({
      'default' : new OpenLayers.Style(
        OpenLayers.Util.applyDefaults({
           pointRadius       : 5
          ,strokeColor       : '#000000'
          ,strokeOpacity     : 1
          ,fillColor         : '#ff0000'
          ,fillOpacity       : 1
        })
      )
    })}
  );

  $('body').on('click', function(e){
    if ($('.popover.fade.right.in').css('display') == 'block')
      if (!$(e.target.parentNode).hasClass('popover') && !$(e.target.parentNode).hasClass('popover-link'))
        $('.popover').popover('hide');
  });

  // get color ramp options
  $.ajax({
     url           : wmsRoot + 'colormaps'
    ,dataType      : 'jsonp'
    ,jsonpCallback : 'processColorramps'
  });

  $('#layer-settings').on('show.bs.modal', function(e) {
    var options = [];
    _.each(colorramps,function(o) {
      options.push('<option data-content="<img width=100 height=13 src=\'' + wmsRoot + 'colormaps?colormap=' + o + '&w=100&h=13\'> ' + o + '">' + o + '</option>');
    });
    $('#layer-settings .modal-dialog .modal-header h4').text(e.relatedTarget.attributes["data-name"].value);
    $('#layer-settings .modal-dialog .modal-body').html('<span class="label label-default">Color ramp</span><select id="colorramp-dropdown" class="selectpicker">' + options.join('') + '</select></div>');
    $('.modal-body .selectpicker').selectpicker();
    var lyr = map.getLayersByName($(e.relatedTarget).data('name'))[0];
    $('#colorramp-dropdown').selectpicker('val',lyr.params.STYLES.split('_')[2]);
    $('#colorramp-dropdown').data('name',lyr.name);
    $('#colorramp-dropdown').selectpicker().on('change',function() {
      var name = $(this).data('name');
      var lyr = map.getLayersByName(name)[0];
      var styles = lyr.params.STYLES.split('_');
      styles[2] = $(this).val();
      map.getLayersByName(name)[0].mergeNewParams({STYLES : styles.join('_')});
      $('#active-layers tr[data-name="' + name + '"]').attr('data-original-title','title="<img src=\'' + getLayerLegend(name) + '\' alt=\'\'>"');
      $('#active-layers tr[data-name="' + name + '"]').tooltip('fixTitle');
    });
    if (lyr.params.LAYERS.indexOf(',') >= 0) {
      $('#layer-settings .modal-dialog .modal-body').append('<br /><span class="label label-default">2D</span><select class="selectpicker" id="plot-dropdown"><option value="vectors">Vectors</option><option value="barbs">Barbs</option><option value="hog">HOG</option></select>');
      $('#plot-dropdown').selectpicker();
      $('#plot-dropdown').selectpicker('val',lyr.params.STYLES.split('_')[0]);
      $('#plot-dropdown').data('name',lyr.name);
      $('#plot-dropdown').selectpicker().on('change',function() {
        var name = $(this).data('name');
        var lyr = map.getLayersByName(name)[0];
        var styles = lyr.params.STYLES.split('_');
        styles[0] = $(this).val();
        map.getLayersByName(name)[0].mergeNewParams({STYLES : styles.join('_')});
        $('#active-layers tr[data-name="' + name + '"]').attr('data-original-title','title="<img src=\'' + getLayerLegend(name) + '\' alt=\'\'>"');
        $('#active-layers tr[data-name="' + name + '"]').tooltip('fixTitle');
        if (/vectors|barbs/.test(styles[0])) {
          $('#stridingBinwidth-label').html('Striding'); 
          $('#stridingBinwidth-slider').data('slider').min  = 0;
          $('#stridingBinwidth-slider').data('slider').max  = 100;
          $('#stridingBinwidth-slider').data('slider').step = 1;
        }
        else {
          $('#stridingBinwidth-label').html('Bin Width');
          $('#stridingBinwidth-slider').data('slider').min  = 0.9;
          $('#stridingBinwidth-slider').data('slider').max  = 100.0;
          $('#stridingBinwidth-slider').data('slider').step = 0.1;
        }
      });

      $('#layer-settings .modal-dialog .modal-body').append('<br /><span class="label label-default" id="stridingBinwidth-label"></span><div class="settings-slider-wrapper"><input type="text" id="stridingBinwidth-slider" class="settings-slider"></div><br /><span class="label label-default">Scale Length</span><div class="settings-slider-wrapper"><input type="text" id="scalelength-slider" class="settings-slider"></div>');
      $('#scalelength-slider').slider({
         min   : 1.0
        ,max   : 20.0
        ,step  : 0.1
        ,value : Number(lyr.params.STYLES.split('_')[4])
        ,formater : function(value) {
          return Math.round(value * 10) / 10;
        }
      });
      $('#scalelength-slider').data('name',lyr.name);
      $('#scalelength-slider').slider().on('slideStop',function(e) {
        var name = $(this).data('name');
        var lyr = map.getLayersByName(name)[0];
        var styles = lyr.params.STYLES.split('_');
        styles[4] = Math.round($(this).data('slider').getValue() * 10) / 10;
        map.getLayersByName(name)[0].mergeNewParams({STYLES : styles.join('_')});
        $('#active-layers tr[data-name="' + name + '"]').attr('data-original-title','title="<img src=\'' + getLayerLegend(name) + '\' alt=\'\'>"');
        $('#active-layers tr[data-name="' + name + '"]').tooltip('fixTitle');
      });

      if (/vectors|barbs/.test(lyr.params.STYLES.split('_')[0])) {
        $('#stridingBinwidth-label').html('Striding');
        $('#stridingBinwidth-slider').slider({
           min   : 0
          ,max   : 100
          ,step  : 1
          ,value : lyr.params.STYLES.split('_')[1] == 'average' ? 0 : Number(lyr.params.STYLES.split('_')[1])
          ,formater : function(value) {
            return value < 1 ? 'average' : value;
          }
        });
      }
      else {
        $('#stridingBinwidth-label').html('Bin Width');
        $('#stridingBinwidth-slider').slider({
           min   : 0.9
          ,max   : 100.0
          ,step  : 0.1
          ,value : lyr.params.STYLES.split('_')[1] == 'average' ? 0.9 : Number(lyr.params.STYLES.split('_')[1])
          ,formater : function(value) {
            return value < 1 ? 'average' : Math.round(value * 10) / 10;
          }
        });
      }
      $('#stridingBinwidth-slider').data('name',lyr.name);
      $('#stridingBinwidth-slider').slider().on('slideStop',function(e) {
        var name = $(this).data('name');
        var lyr = map.getLayersByName(name)[0];
        var styles = lyr.params.STYLES.split('_');
        styles[1] = $(this).data('slider').getValue() < 1 ? 'average' : Math.round($(this).data('slider').getValue() * 10) / 10;
        map.getLayersByName(name)[0].mergeNewParams({STYLES : styles.join('_')});
        $('#active-layers tr[data-name="' + name + '"]').attr('data-original-title','title="<img src=\'' + getLayerLegend(name) + '\' alt=\'\'>"');
        $('#active-layers tr[data-name="' + name + '"]').tooltip('fixTitle');
      });
    }
   
    $('#layer-settings .modal-dialog .modal-body').append('<br /><span class="label label-default">Min / Max</span><div class="settings-slider-wrapper span2"><input type="text" id="minmax-slider" class="settings-slider"></div>');
    $('#minmax-slider').slider({
       min   : -25
      ,max   : 100
      ,step  : 1
      ,value : [Number(lyr.params.STYLES.split('_')[3]),Number(lyr.params.STYLES.split('_')[4])]
    });
    $('#minmax-slider').data('name',lyr.name);
    $('#minmax-slider').slider().on('slideStop',function(e) {
      var name = $(this).data('name');
      var lyr = map.getLayersByName(name)[0];
      var styles = lyr.params.STYLES.split('_');
      styles[3] = $(this).data('slider').getValue()[0];
      styles[4] = $(this).data('slider').getValue()[1];
      map.getLayersByName(name)[0].mergeNewParams({STYLES : styles.join('_')});
      $('#active-layers tr[data-name="' + name + '"]').attr('data-original-title','title="<img src=\'' + getLayerLegend(name) + '\' alt=\'\'>"');
      $('#active-layers tr[data-name="' + name + '"]').tooltip('fixTitle');
    });
 
    if (navigator.userAgent.match(/Firefox/i)) {
      $('#layer-settings .modal-dialog .modal-body span.label:eq(0)').css({marginTop: '1px'});
      $('#layer-settings .modal-dialog .modal-body span.label:eq(2), #layer-settings .modal-dialog .modal-body span.label:eq(3)').css({paddingTop: '10px'});
      $('#layer-settings .settings-slider-wrapper').css({height: '30px'});
    }
  });

  map = new OpenLayers.Map('mapView',{
    layers  : [
      new OpenLayers.Layer.XYZ(
         'ESRI Ocean'
        ,'http://services.arcgisonline.com/ArcGIS/rest/services/Ocean_Basemap/MapServer/tile/${z}/${y}/${x}.jpg'
        ,{
           sphericalMercator : true
          ,isBaseLayer       : true
          ,wrapDateLine      : true
        }
      )
      ,lyrQuery
    ]
    ,center : new OpenLayers.LonLat(-83,28).transform(proj4326,proj3857)
    ,zoom   : 5
  });

  map.events.register('click',this,function(e) {
    clearQuery();
    query(e.xy);
  });

  map.events.register('addlayer',this,function(e) {
    // keep important stuff on top
    map.setLayerIndex(lyrQuery,map.layers.length - 1);
    _.each(_.filter(map.layers,function(o){return o.renderer && o.name != 'Query points'}),function(o) {
      map.setLayerIndex(o,map.layers.length - 2);
    });
  });

  $('#query-results').DataTable({
     searching      : false
    ,lengthChange   : false
    ,iDisplayLength : 50
    ,sScrollY       : $(window).height() - activeMapLayersTableOffset - queryResultsFooterOffset
    ,fnDrawCallback : function() {
      $('#results .table-wrapper td a').on('click', addToMap);
      $('.dataTables_scrollHead').hide();
    }
  });

  $('#event-list.selectpicker,#model-list.selectpicker').selectpicker().on('change',filterValueSelect);

  $.when(
    $.ajax({
       url           : wmsRoot + 'datasets/'
      ,dataType      : 'jsonp'
      ,jsonpCallback : 'foo'
    })
    ,$.ajax({
       url           : 'obs.json?' + new Date().getTime() + Math.random()
      ,dataType      : 'json'
    })
    ).done(function(model,obs) {
      // The catalog comes in as an array w/ each element containing one key (name) that points
      // to the payload.  Reduce the complexity by one and simply pump the catalog into an
      // array of objects where the name is one of the attrs.
      _.each(model[0].concat(obs[0]),function(o) {
        var d = _.values(o)[0];
        if (d && d.storm && d.category && !_.isEmpty(d.layers) && !_.isEmpty(d.temporal)) {
          d.name = _.keys(o)[0];
          d.idx  = catalog.length;

          var tSpan = '';
          var minT = d.temporal[0];
          var maxT = d.temporal[1];
          if (minT != '' && maxT != '') {
            if (isoDateToDate(minT).format('UTC:mmm d, yyyy') == isoDateToDate(maxT).format('UTC:mmm d, yyyy')) {
              tSpan = isoDateToDate(minT).format('UTC:mmm d, yyyy');
            }
            else if (isoDateToDate(minT).format('UTC:yyyy') == isoDateToDate(maxT).format('UTC:yyyy')) {
              if (isoDateToDate(minT).format('UTC:mmm') == isoDateToDate(maxT).format('UTC:mmm')) {
                tSpan = isoDateToDate(minT).format('UTC:mmm d') + ' - ' + isoDateToDate(maxT).format('UTC:d, yyyy');
              }
              else {
                tSpan = isoDateToDate(minT).format('UTC:mmm d') + ' - ' + isoDateToDate(maxT).format('UTC:mmm d, yyyy');
              }
            }
            else {
              tSpan = isoDateToDate(minT).format('UTC:mmm d, yyyy') + ' - ' + isoDateToDate(maxT).format('UTC:mmm d, yyyy');
            }
          }
          d.tSpan = tSpan;

          var layers = [];
          _.each(_.sortBy(_.keys(d.layers),function(o){return cf2alias(o)}),function(l) {
            if (!name2Color[l]) {
              name2Color[l] = buttonClasses[_.size(name2Color) % buttonClasses.length];
            }
            layers.push('<a href="#" data-idx="' + d.idx + '" data-name="' + l + '" class="btn btn-' + name2Color[l] + '">' + cf2alias(l) + '</a>');
          });

          var thumb = '<img width=60 height=60 src="https://maps.googleapis.com/maps/api/staticmap?key=AIzaSyBuB8P_e6vQcucjnE64Kh2Fwu6WzhMXZzI&path=weight:1|fillcolor:0x0000AA11|color:0x0000FFBB|' + d.spatial[1] + ',' + d.spatial[0] + '|' + d.spatial[1] + ',' + d.spatial[2] + '|' + d.spatial[3] + ',' + d.spatial[2] + '|' + d.spatial[3] + ',' + d.spatial[0] + '|' + d.spatial[1] + ',' + d.spatial[0] + '&size=60x60&sensor=false" title="Data boundaries" alt="Data boundaries">';
          var abstract = '';
          // var abstract = '<p>' + 'This is a test.' + '</p>';
          d.tr = ['<div class="thumbnail">' + thumb + '</div><div class="title">' + d.name + '</div><br />' + abstract + '<div class="time-range"><div class="time-range-label"><span class="glyphicon glyphicon-time"></span>Time Range</div><input type="text" name="timeRange" value="' + d.tSpan + '" disabled class="form-control"></div><div class="download-data"><a target=_blank href="' + d.url + '" title="Download Data"><span class="glyphicon glyphicon-download"></span>Download Data</a></div>' + layers.join(' ')];

          catalog.push(d);
        }
      });

      // Populate the options.
      var i = 0;
      var cat;
      $('#categories').empty();
      _.each(_.sortBy(_.uniq(_.pluck(catalog,'category')),function(o){return o.toUpperCase()}),function(o) {
        if (i == 0) {
          cat = o;
        }
        $('#categories').append('<label class="btn btn-default ' + (i == 0 ? 'active' : '') + '"><input type="radio" name="categories" id="' + o + '" ' + (i == 0 ? 'checked' : '') + '>' + o + '</label>');
        i++;
      });

      syncFilters(cat);

      $('#categories.btn-group input').on('change', categoryClick);
      syncQueryResults();
    }
  );

  $('#time-slider').slider({
    step: 6 * 3600000,
    formater: function(value) {
      var dateTime = new Date(value);
      return dateTime.format('UTC:yyyy-mm-dd HH:00"Z"');
    },
  });
  $('#time-slider').slider().on('slideStop',function(e) {
    setDate(new Date($(this).data('slider').getValue()));
  });
  $('#depth-slider').slider({
    orientation: 'vertical'
  });

  $('.btn').button().mouseup(function(){$(this).blur();});
  $('#active-layers button').on('click', clearMap);
  $('#clear-query').on('click', clearQuery);
  $('#active-layers div table tbody').tooltip({selector: 'tr'});
  $('#active-layers div table tbody').popover({selector: 'a.popover-link'}).on('mouseup', function(e) {
    if ($('.popover.fade.right.in').css('display') == 'block')
        $('.popover').popover('hide');
  });

  $('#time-series-graph').bind('plothover',function(event,pos,item) {
    if (item) {
      var x = new Date(item.datapoint[0]);
      var y = item.datapoint[1];
      if (prevPoint != item.dataIndex) {
        $('#tooltip').remove();
        var a = item.series.label.match(/(\([^\)]*\))<\/a>/);
        if (a.length == 2) {
          var u = a.pop();
          u = u.substr(1,u.length - 2);
        }
        showToolTip(item.pageX,item.pageY,new Date(x).format('UTC:yyyy-mm-dd HH:00"Z"') + ' : ' + (Math.round(y * 100) / 100) + ' ' + u);
      }
      prevPoint = item.dataIndex;
    }
    else {
      $('#tooltip').remove();
      prevPoint = null;
    }
  });

  resize();
  if (!/DEV/.test(document.title)) {
    $('#beta-notice').modal();
  }
});

function syncTimeSlider(t) {
  var times = t ? t : [];
  $.each($('#active-layers table tbody tr td:first-child'),function() {
    var lyr = map.getLayersByName($(this).text())[0];
    if (lyr.visibility) {
      times = times.concat(lyr.times);
    }
  });
  if (times.length > 1) {
    // don't show the time slider if the 1st and last times are the same
    if (
      (times[0] != times[times.length - 1] && !$('#time-slider-wrapper').is(':visible'))
      || (times[0] == times[times.length - 1] && $('#time-slider-wrapper').is(':visible'))
    ) {
      $('#time-slider-wrapper').toggle();
    }
    times.sort();
    var startDate = isoDateToDate(times[0]);
    var endDate = isoDateToDate(times[times.length - 1]);
    if (!mapDate || !(startDate <= mapDate && mapDate <= endDate)) {
      setDate(startDate);
    }
    $('#time-slider').data('slider').min = startDate.getTime();
    $('#time-slider').data('slider').max = endDate.getTime();
    $('#time-slider').slider('setValue',mapDate.getTime());
    $('#time-slider-min').val(startDate.format('UTC:yyyy-mm-dd'));
    $('#time-slider-max').val(endDate.format('UTC:yyyy-mm-dd'));
  }
  else {
    if ($('#time-slider-wrapper').is(':visible')) {
      $('#time-slider-wrapper').toggle();
    }
    mapDate = false;
  }
}

function syncFilters(cat) {
  $('#event-list').empty();
  $('#event-list').append('<option checked value="' + 'ALL' + '">' + 'ALL' + '</option>');
  _.each(_.sortBy(_.uniq(_.pluck(_.filter(catalog,function(o){return o.category == cat}),'storm')),function(o){return o.toUpperCase()}),function(o) {
    $('#event-list').append('<option value="' + o + '">' + o + '</option>');
  });
   $('#event-list').selectpicker('refresh');

  $('#model-list').empty();
  $('#model-list').append('<option checked value="' + 'ALL' + '">' + 'ALL' + '</option>');
  _.each(_.sortBy(_.uniq(_.pluck(_.filter(catalog,function(o){return o.category == cat}),'org_model')),function(o){return o.toUpperCase()}),function(o) {
    $('#model-list').append('<option value="' + o + '">' + o + '</option>');
  });
  $('#model-list').selectpicker('refresh');
}

function syncQueryResults() {
  $('#query-results').DataTable().clear();
  $('#query-results').DataTable().row.add(['Loading...']).draw();
  // give the table a chance to show the Loading... line
  setTimeout(function() {
    var i = 0;
    var c = catalog.filter(function(o) {
      var category = o.category == $('#categories.btn-group input:checked').attr('id');
      var event = $('#event-list option:selected').val() == 'ALL' || $('#event-list option:selected').val() == o.storm;
      var model = $('#model-list option:selected').val() == 'ALL' || $('#model-list option:selected').val() == o.org_model;
      return category && event && model;
    });
    $('#query-results').DataTable().clear();
    $('#query-results').DataTable().rows.add(_.pluck(_.sortBy(c,function(o){return o.name.toUpperCase()}),'tr')).draw();
  },100);
}

function isoDateToDate(s) {
  // 2010-01-01T00:00:00 or 2010-01-01 00:00:00
  s = s.replace("\n",'');
  var p = s.split(/T| /);
  if (p.length == 2) {
    var ymd = p[0].split('-');
    var hm = p[1].split(':');
    var d = new Date(
       ymd[0]
      ,ymd[1] - 1
      ,ymd[2]
      ,hm[0]
      ,hm[1]
    );
    return new Date(d.getTime() - d.getTimezoneOffset() * 60 * 1000);
  }
  else {
    return false;
  }
}

function addWMS(d) {
  _gaq.push(['_trackEvent','add layer',d.group + '-' + cf2alias(d.layers)]);
  var lyr = new OpenLayers.Layer.WMS(
     d.group + '-' + cf2alias(d.layers)
    ,wmsRoot + 'datasets/' + d.group + '/'
    ,{
       layers      : d.layers
      ,transparent : true
      ,styles      : d.styles
      ,format      : 'image/png'
      ,TIME        : mapDate.format('UTC:yyyy-mm-dd"T"HH:00:00')
    }
    ,{
       isBaseLayer      : false
      ,projection       : proj3857
      ,singleTile       : singleTile
      ,wrapDateLine     : true
      ,visibility       : true
      ,opacity          : 1
      ,noMagic          : true
      ,transitionEffect : 'resize'
    }
  );
  lyr.group = d.group;
  lyr.times = d.times;
  lyr.bbox  = d.bbox;
  lyr.activeQuery = 0;
  map.zoomToExtent(d.bbox);

  lyr.events.register('loadstart',this,function(e) {
    $('#active-layers a[data-name="' + e.object.name + '"] img').show();
    $('#active-layers a[data-name="' + e.object.name + '"] span').hide();
  });
  lyr.events.register('loadend',this,function(e) {
    if (e.object.activeQuery == 0) {
      $('#active-layers a[data-name="' + e.object.name + '"] img').hide();
      $('#active-layers a[data-name="' + e.object.name + '"] span').show();
    }
  });
  lyr.events.register('visibilitychanged',this,function(e) {
    syncTimeSlider();
  });
  map.addLayer(lyr);
  return lyr.name;
}

function addObs(d) {
  var lyr = new OpenLayers.Layer.Vector(
     d.group + '-' + d.layers
  );
  lyr.group = d.group;
  lyr.times = d.times;
  lyr.bbox  = d.bbox;
  lyr.activeQuery = 0;
  map.zoomToExtent(d.bbox);

  $.ajax({
     url      : 'obs/' + d.group + '.json' + '?' + new Date().getTime() + Math.random()
    ,dataType : 'json'
    ,lyr      : lyr.name
    ,success  : function(r) {
      var features = [];
      _.each(r.stations,function(o) {
        var v = _.values(o)[0];
        var k = _.keys(o)[0];
        var f = new OpenLayers.Feature.Vector(
          new OpenLayers.Geometry.Point(v.spatial[0],v.spatial[1]).transform(proj4326,proj3857)
        );
        features.push(f);
        f.attributes = {
          getObs : r.getObs.url
            + '&offering=' + r.getObs.offering + k
            + '&procedure=' + r.getObs.procedure + k
            + '&observedProperty=' + d.layers
            + '&eventTime=' + isoDateToDate(d.times[0]).format('UTC:yyyy-mm-dd"T"HH:00:00') + '/' + isoDateToDate(d.times[1]).format('UTC:yyyy-mm-dd"T"HH:00:00')
          ,name : k
        };
      });
      var lyr = map.getLayersByName(this.lyr)[0];
      if (lyr) {
        lyr.addFeatures(features); 
      }
    }
  });

  lyr.events.register('loadstart',this,function(e) {
    $('#active-layers a[data-name="' + e.object.name + '"] img').show();
    $('#active-layers a[data-name="' + e.object.name + '"] span').hide();
  });
  lyr.events.register('loadend',this,function(e) {
    if (e.object.activeQuery == 0) {
      $('#active-layers a[data-name="' + e.object.name + '"] img').hide();
      $('#active-layers a[data-name="' + e.object.name + '"] span').show();
    }
  });
  lyr.events.register('visibilitychanged',this,function(e) {
    syncTimeSlider();
  });
  map.addLayer(lyr);
  return lyr.name;
}

function getLayerLegend(name) {
  var lyr = map.getLayersByName(name)[0];
  return lyr.getFullRequestString({
     REQUEST : 'GetLegendGraphic'
    ,LAYER   : lyr.params.LAYERS
    ,TIME    : mapDate.format('UTC:yyyy-mm-dd"T"HH:00:00')
  });
}

function toggleLayerVisibility(name) {
  var lyr = map.getLayersByName(name)[0];
  lyr.setVisibility(!lyr.visibility);
}

function zoomToLayer(name) {
  map.zoomToExtent(map.getLayersByName(name)[0].bbox);
}

function setDate(dt) {
  mapDate = dt;
  $.each($('#active-layers table tbody tr td:first-child'),function() {
    var lyr = map.getLayersByName($(this).text())[0];
    if (lyr.DEFAULT_PARAMS) {
      lyr.mergeNewParams({TIME : mapDate.format('UTC:yyyy-mm-dd"T"HH:00:00')});
    }
  });
  plot();
}

function clearMap() {
  clearQuery();
  $.each($('#active-layers table tbody tr td:first-child'),function() {
    map.removeLayer(map.getLayersByName($(this).text())[0]);
  });
  $('#active-layers table tbody tr').remove();
  $('#active-layers table thead th:last-child').css('width', '30px');
  if ($('#time-slider-wrapper').is(':visible')) {
    $('#time-slider-wrapper').toggle();
  }
  mapDate = false;
}

function clearQuery() {
  plotData = [];
  plot();
  lyrQuery.removeAllFeatures();
}

function query(xy) {
  plotData = [];
  var lonLat = map.getLonLatFromPixel(xy);
  var pt = new OpenLayers.Geometry.Point(lonLat.lon,lonLat.lat);
  var f  = new OpenLayers.Feature.Vector(pt);
  lyrQuery.addFeatures([f]);

  _.each(_.filter(map.layers,function(o){return o.features && o.features.length > 0 && o.features[0].attributes && o.features[0].attributes.getObs && o.visibility}),function(l) {
    // find the closest site w/i a tolerance
    var f;
    var minD;
    _.each(l.features,function(o) {
      var d = pt.distanceTo(o.geometry.getCentroid());
      if (d <= 10000) {
        if (_.isUndefined(minD) || d < minD) {
          f = o.clone();
        }
        minD = d;
      }
    });
    if (f) {
      l.events.triggerEvent('loadstart');
      l.activeQuery++;
      $.ajax({
         url      : f.attributes.getObs
        ,title    : l.name
        ,dataType : 'xml'
        ,success  : function(r) {
          var lyr = map.getLayersByName(this.title)[0];
          if (lyr) {
            lyr.activeQuery--;
            lyr.events.triggerEvent('loadend');
          }
          var $xml = $(r);
          var d = {
             data  : []
            ,label : '<a target=_blank href="' + this.url + '">' + '&nbsp;' + this.title + ' (' + $xml.find('uom[code]').attr('code') + ')' + '</a>'
          };
          var z = [];
          _.each($xml.find('values').text().split(" "),function(o) {
            var a = o.split(',');
            if ((a.length == 2 || a.length == 3) && $.isNumeric(a[1])) {
              // only take the 1st value for each time
              var t = isoDateToDate(a[0]).getTime();
              if (!_.find(d.data,function(o){return o[0] == t})) {
                d.data.push([t,a[1]]);
                if (a.length == 3) {
                  z.push(a[2]);
                }
              }
            }
          });
          if (!_.isEmpty(z)) {
            z = _.uniq(z.sort(function(a,b){return a-b}),true);
            d.label = '<a target=_blank href="' + this.url + '">' + '&nbsp;' + this.title + ' [' + $($xml.find('field')[2]).attr('name') + ' ' + z[0];
            if (z.length > 1) {
              d.label += ' - ' + z[z.length - 1];
            }
            d.label += '] (' + $xml.find('uom').attr('code') + ')' + '</a>';
          }
          d.color = lineColors[plotData.length % lineColors.length][0];
          d.points = {show : d.data.length == 1};
          d.lines  = {show : d.data.length > 1};
          plotData.push(d);
          plot();
        }
        ,error    : function(r) {
          var lyr = map.getLayersByName(this.title)[0];
          if (lyr) {
            lyr.activeQuery--;
            lyr.events.triggerEvent('loadend');
          }
          var d = {
             data  : []
            ,label : '<a target=_blank href="' + this.url + '">' + '&nbsp;' + this.title + ' <font color=red><b>ERROR</b></font>'
          };
          d.color = lineColors[plotData.length % lineColors.length][0];
          plotData.push(d);
          plot();
        }
      });
    }
  });

  _.each(_.filter(map.layers,function(o){return o.DEFAULT_PARAMS && o.visibility}),function(l) {
    l.events.triggerEvent('loadstart');
    var u = l.getFullRequestString({
       REQUEST      : 'GetFeatureInfo'
      ,INFO_FORMAT  : 'text/javascript'
      ,QUERY_LAYERS : l.params.LAYERS
      ,BBOX         : map.getExtent().toBBOX()
      ,WIDTH        : map.size.w
      ,HEIGHT       : map.size.h
      ,X            : Math.round(xy.x)
      ,Y            : Math.round(xy.y)
      ,TIME         : new Date($('#time-slider').data('slider').min).format('UTC:yyyy-mm-dd"T"HH:00:00') + '/' + new Date($('#time-slider').data('slider').max).format('UTC:yyyy-mm-dd"T"HH:00:00')
    });
    l.activeQuery++;
    $.ajax({
       url      : u
      ,dataType : 'jsonp'
      ,v        : l.params.LAYERS
      ,title    : l.name
      ,timeout  : 60000 // JSONP won't trap errors natively, so use a timeout.
      ,success  : function(r) {
        _gaq.push(['_trackEvent','query layer - OK',this.title]);
        var lyr = map.getLayersByName(this.title)[0];
        if (lyr) {
          lyr.activeQuery--;
          lyr.events.triggerEvent('loadend');
        }
        var uv = this.v.split(',');
        if (uv.length == 2 && r.properties[uv[0]] && r.properties[uv[1]]) {
          var d = {
             data  : []
            ,vData : []
            ,label : '<a target=_blank href="' + this.url + '">' + '&nbsp;' + this.title + ' (' + r.properties[uv[0]].units + ')' + '</a>'
          };
          for (var i = 0; i < r.properties.time.values.length; i++) {
            var u = r.properties[uv[0]].values[i];
            var v = r.properties[uv[1]].values[i];
            var spd = Math.sqrt(Math.pow(u,2) + Math.pow(v,2));
            var dir = Math.atan2(u,v) * 180 / Math.PI;
            dir += dir < 0 ? 360 : 0;
            d.data.push([isoDateToDate(r.properties.time.values[i]).getTime(),spd]);
            d.vData.push([isoDateToDate(r.properties.time.values[i]).getTime(),dir]);
          }
          d.color = lineColors[plotData.length % lineColors.length][0];
          plotData.push(d);
        }
        else if (r.properties[this.v]) {
          var d = {
             data  : []
            ,label : '<a target=_blank href="' + this.url + '">' + '&nbsp;' + this.title + ' (' + r.properties[this.v].units + ')' + '</a>'
          };
          for (var i = 0; i < r.properties.time.values.length; i++) {
            var val = _.isUndefined(r.properties[this.v].values[i]) ? r.properties[this.v].values[0] : r.properties[this.v].values[i];
            d.data.push([isoDateToDate(r.properties.time.values[i]).getTime(),val]);
          }
          d.color = lineColors[plotData.length % lineColors.length][0];
          d.points = {show : d.data.length == 1};
          d.lines  = {show : d.data.length > 1};
          plotData.push(d); 
        }
        plot();
      }
      ,error    : function(r) {
        _gaq.push(['_trackEvent','query layer - ERROR',this.title]);
        var lyr = map.getLayersByName(this.title)[0];
        if (lyr) {
          lyr.activeQuery--;
          lyr.events.triggerEvent('loadend');
        }
        var d = {
           data  : []
          ,label : '<a target=_blank href="' + this.url + '">' + '&nbsp;' + this.title + ' <font color=red><b>ERROR</b></font>'
        };
        d.color = lineColors[plotData.length % lineColors.length][0];
        plotData.push(d);
        plot();
      } 
    });
  });
}

function plot() {
  $('#time-series-graph').empty();
  if (_.size(plotData) > 0) {
    var plot = $.plot(
       $('#time-series-graph')
      ,plotData
      ,{
         xaxis     : {mode  : "time"}
        ,crosshair : {mode  : 'x'   }
        ,grid      : {
           backgroundColor : {colors : ['#fff','#eee']}
          ,borderWidth     : 1
          ,borderColor     : '#99BBE8'
          ,hoverable       : true
          ,markings        : [{color : '#0e90d2',lineWidth : 2,xaxis : {from : mapDate.getTime(),to : mapDate.getTime()}}]
        }
        ,zoom      : {interactive : false}
        ,pan       : {interactive : false}
        ,legend    : {backgroundOpacity : 0.3}
      }
    );

    // go back and plot any vectors
    var imageSize = 80;
    _.each(plotData,function(d) {
      if (d.vData) {
        var c = _.find(lineColors,function(o){return o[0] == d.color})[1];
        // assume 1:1 for u:v
        for (var i = 0; i < d.data.length; i++) {
          var o = plot.pointOffset({x : d.data[i][0],y : d.data[i][1]});
          $('#time-series-graph').prepend('<div class="dir" style="position:absolute;left:' + (o.left-imageSize/2) + 'px;top:' + (o.top-(imageSize/2)) + 'px;background-image:url(\'./img/arrows/' + imageSize + 'x' + imageSize + '.dir' + Math.round(d.vData[i][1]) + '.' + c.replace('#','') + '.png\');width:' + imageSize + 'px;height:' + imageSize + 'px;"></div>');
        }
      }
    });
  }
}

function showToolTip(x,y,contents) {
  $('<div id="tooltip">' + contents + '</div>').css({
     position           : 'absolute'
    ,display            : 'none'
    ,top                : y + 10
    ,left               : x + 10
    ,border             : '1px solid #99BBE8'
    ,padding            : '2px'
    ,'background-color' : '#fff'
    ,opacity            : 0.80
    ,'z-index'          : 10000001
  }).appendTo("body").fadeIn(200);
}

function processColorramps(r) {
  colorramps = _.sortBy(r,function(o){return o.toLowerCase()});
}

function cf2alias(sn) {
  // This LUT came to me from on high.  I'm too lazy to do anything other than have
  // underscore flatten this into an array for me (below) for it to be usable.
  var cfmap = {
    'time': {'standard_name':'time'},
    'longitude': {'standard_name':'longitude', 'scale_min':'0', 'scale_max':'360'},
    'latitude': {'standard_name':'latitude', 'scale_min':'-90', 'scale_max':'90'},
    'ssh_geoid': {'standard_name':'sea_surface_height_above_geoid', 'scale_min':'0', 'scale_max':'7.0'},
    'ssh_reference_datum': {'standard_name':'water_surface_height_above_reference_datum', 'scale_min':'0', 'scale_max':'7.0'},
    'u,v': {'standard_name':'eastward_sea_water_velocity,northward_sea_water_velocity', 'scale_min':'0', 'scale_max':'2'},
    'hs': {'standard_name':'sea_surface_wave_significant_height', 'scale_min':'0', 'scale_max':'12'},
    'uwind,vwind': {'standard_name':'eastward_wind,northward_wind','scale_min':0, 'scale_max':80},
    'salinity': {'standard_name':'sea_water_salinity', 'scale_min':'32', 'scale_max':'37'},
    'sst': {'standard_name':'sea_water_temperature', 'scale_min':'0', 'scale_max':'40'},
    'ubarotropic,vbarotropic': {'standard_name':'barotropic_eastward_sea_water_velocity,barotropic_northward_sea_water_velocity', 'scale_min':'0', 'scale_max':'2'},
  };
  // flatten the LUT and hunt down the alias by standard_name
  var o = _.findWhere(_.map(cfmap,function(v,k){v.alias = k;return v}),{standard_name : sn});
  return o ? o.alias : sn;
}
