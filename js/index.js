angular.module('forcedirectedApp', [])
  .directive('forcedirectedChart', function() {
    return {
      restrict: 'E',
      scope: {
        links: '='
      },
      template: '<div class="forcedirected-chart"><div id="forcedirectedPanel{{panelIndex}}"></div>' +
        '<div class="forcedirected-legend">' +
        '<div class="forcedirected-legend-block" ng-repeat="block in legendBlocks"><div class="forcedirected-legend-block-title">{{block.label}}</div>' +
        '<span ng-repeat="n in block.items track by $index" class="forcedirected-legend-item legend_{{n.style}}"><span class="forcedirected-legend-bullet"></span><span>{{n.label}}</span>' +
        '</div>',
      link: function(scope, elem, attr) {
        scope.panelIndex = Math.floor((Math.random() * 10000) + 1);
        var margin = {
          top: 8,
          right: 8,
          bottom: 8,
          left: 8
        };

        function circlePath(cx, cy, r) {
          return 'M ' + cx + ' ' + cy + ' m -' + r + ', 0 a ' + r + ',' + r + ' 0 1,0 ' + (r * 2) + ',0 a ' + r + ',' + r + ' 0 1,0 -' + (r * 2) + ',0';
        }

        function hexagonPath(cx, cy, a) {
          var h = a * Math.sin(Math.PI / 3);
          var points = [];
          points.push({
            x: cx - a,
            y: cy
          });
          points.push({
            x: cx - a / 2,
            y: cy + h
          });
          points.push({
            x: cx + a / 2,
            y: cy + h
          });
          points.push({
            x: parseInt(cx) + parseInt(a),
            y: cy
          });
          points.push({
            x: cx + a / 2,
            y: cy - h
          });
          points.push({
            x: cx - a / 2,
            y: cy - h
          });
          points.push({
            x: cx - a,
            y: cy
          }); /// ?????
          var path = "M 0 0";
          for (var i = 0; i < points.length; i++) {
            var p = points[i];
            path += "L" + p.x + " " + p.y + " ";
          }
          return path + " Z";
        }

        var nodePaths = function(type, r) {
          if (type == "hexagon")
            return hexagonPath(0, 0, r);
          else
            return circlePath(0, 0, r);

        };

        var nodeTypeIcon = scope.$eval(attr.nodeTypeIcon);
        if (typeof attr.linkLine == 'undefined' || attr.linkLine === null)
          attr.linkLine = "bezier";

        var linkLength = 120;
        if (typeof attr.linkLength != 'undefined' && attr.linkLength !== null && attr.linkLength !== "null" && attr.linkLength !== "") {
          linkLength = attr.linkLength;
        }

        var radiusMin = 10;
        var radius = Math.round(radiusMin + radiusMin / 2);

        if (typeof attr.nodeSize != 'undefined' && attr.nodeSize !== null && attr.nodeSize !== "null" && attr.nodeSize !== "") {
          radius = attr.nodeSize;
          radiusMin = Math.round(2 * radius / 3);
        }

        var computeStatistic = false;
        if (attr.computeStatistic == 'true')
          computeStatistic = true;

        scope.$watch('links', function() {
          var width = (typeof attr.width == 'undefined' || attr.width === null) ? 500 : parseInt(attr.width);
          var height = (typeof attr.height == 'undefined' || attr.height === null) ? 500 : parseInt(attr.height);

          height = height - margin.top - margin.bottom;
          var links = scope.links;
          var nodes = {};
          var linksTypes = {};
          scope.legendBlocks = {
            "Links": {
              items: [],
              name: "Links"
            }
          };

          // Compute the distinct nodes from the links.
          links.forEach(function(link) {
            var nodeIcon = 'circle';
            if (typeof nodeTypeIcon != 'undefined' && nodeTypeIcon !== null && nodeTypeIcon[link.sourceType] != 'undefined')
              nodeIcon = nodeTypeIcon[link.sourceType];

            link.source = nodes[link.source + "_" + link.sourceType] || (nodes[link.source + "_" + link.sourceType] = {
              name: link.source,
              type: link.sourceType,
              label: link.sourceLabel,
              count: 0,
              radius: radius,
              nodeIcon: nodeIcon
            });
            nodes[link.source.name + "_" + link.sourceType].count += link.count;

            nodeIcon = 'circle';
            if (typeof nodeTypeIcon != 'undefined' && nodeTypeIcon !== null && nodeTypeIcon[link.sourceType] != 'undefined')
              nodeIcon = nodeTypeIcon[link.targetType];

            link.target = nodes[link.target + "_" + link.targetType] || (nodes[link.target + "_" + link.targetType] = {
              name: link.target,
              type: link.targetType,
              label: link.targetLabel,
              count: 0,
              radius: radius,
              nodeIcon: nodeIcon
            });
            nodes[link.target.name + "_" + link.targetType].count += link.count;

            // prepare legend for links
            if (typeof linksTypes[link.type] == 'undefined') {
              linksTypes[link.type] = link.type;
              scope.legendBlocks.Links.items.push({
                "label": link.type,
                "style": "Links " + link.type
              });
            }
          });

          scope.legendNodes = [];

          for (var key in nodes) {
            if (nodes.hasOwnProperty(key)) {
              var nodeType = nodes[key].type;
              if (typeof scope.legendBlocks[nodeType] == 'undefined')
                scope.legendBlocks[nodeType] = {
                  "name": nodeType,
                  "label": nodes[key].label,
                  "items": []
                };
              scope.legendBlocks[nodeType].items.push({
                "label": nodes[key].name,
                "style": nodes[key].type + " " + clearString(nodes[key].name.split(' ').join('_'))
              });

            }
          }

          var force = d3.layout.force().nodes(d3.values(nodes)).links(links).size([width, height]).linkDistance(linkLength).charge(-800).on("tick", tick)
            .start();

          d3.select("#forcedirectedPanel" + scope.panelIndex + " svg").remove();
          var svg = d3.select("#forcedirectedPanel" + scope.panelIndex).append("svg").attr("class", "forcedirected-chart").attr("width",
            width + margin.left + margin.right).attr("height", height + margin.top + margin.bottom);

          var path = svg.append("g").selectAll("path").data(force.links()).enter().append("path").attr("class", function(d) {
            return "link link_" + d.type + " " + "source_" + clearString(d.source.name.split(' ').join('_')) + " " + "target_" + clearString(d.target.name.split(' ').join('_')) +
              " link_" + d.sourceType + "_" + d.targetType;
          }).attr("marker-end", function(d) {
            return "url(#link_" + d.sourceType + "_" + d.targetType + ")";
          });

          var circle = svg.append("g").selectAll("circle").data(force.nodes()).enter().append("path")
            .attr("d", function(d) {
              return nodePaths(d.nodeIcon, d.radius);
            }).attr("class", function(d) {
              var clazz = "node " + d.type;
              if (typeof d.name != 'undefined')
                clazz += " " + clearString(d.name.split(' ').join('_'));
              return clazz;
            }).call(force.drag);

          var text = svg.append("g").selectAll("text").data(force.nodes()).enter().append("text").attr("x", 8).attr("y", ".31em").attr("class", function(d) {
            var clazz = "label " + d.type;
            if (typeof d.name != 'undefined')
              clazz += " " + clearString(d.name.split(' ').join('_'));
            return clazz;
          }).text(function(d) {
            return d.name;
          });

          function tick(d) {
            path.attr("d", linkLine);
            circle.attr("transform", transform);
            text.attr("transform", transform);
          }

        });

        function linkLine(d) {
          if (attr.linkLine == "bezier")
            return linkBezier(d);
          else if (attr.linkLine == "arc")
            return linkArc(d);
          else if (attr.linkLine == "straight")
            return linkStraight(d);
          else
            return linkBezier(d);
        }

        function linkArc(d) {
          var dx = d.target.x - d.source.x,
            dy = d.target.y - d.source.y,
            dr = Math.sqrt(dx * dx + dy * dy);
          return "M" + d.source.x + "," + d.source.y + "A" + dr + "," + dr + " 0 0,1 " + d.target.x + "," + d.target.y;
        }

        function linkStraight(d) {
          return "M" + d.source.x + "," + d.source.y + "L" + d.target.x + "," + d.target.y;
        }

        function clearString(input) {
          return input.replace(/[^\w\s]/gi, '');
        }

        function linkBezier(d) {
          var curvature = 0.5;
          var xi = d3.interpolateNumber(d.source.x, d.target.x);
          var x2 = xi(curvature);
          var x3 = xi(1 - curvature);

          return "M" + d.source.x + "," + d.source.y +
            "C" + x2 + "," + d.source.y +
            " " + x3 + "," + d.target.y +
            " " + d.target.x + "," + d.target.y;
        }

        function transform(d) {
          return "translate(" + d.x + "," + d.y + ")";
        }

      }
    };

  }).controller('forcedirectedController', function($scope) {
    $scope.mcuSimple = [{source:"Pattani", sourceType: "Character",target:"Prince of Songkla University", targetType: "Movie",type:"Main"},
      {source:"Hatyai", sourceType: "Character",target:"Prince of Songkla University", targetType: "Movie",type:"Main"},
      {source:"Phuket", sourceType: "Character",target:"Prince of Songkla University", targetType: "Movie",type:"Main"},
      {source:"Suratthani", sourceType: "Character",target:"Prince of Songkla University", targetType: "Movie",type:"Main"},
      {source:"Trang", sourceType: "Character",target:"Prince of Songkla University", targetType: "Movie",type:"Main"},

      {source:"Hatyai", sourceType: "Character",target:"Graduate School", targetType: "Movie",type:"Side"},
      {source:"Hatyai", sourceType: "Character",target:"Faculty of Science", targetType: "Movie",type:"Side"},
      {source:"Hatyai", sourceType: "Character",target:"Faculty of Engineering", targetType: "Movie",type:"Side"},
      {source:"Hatyai", sourceType: "Character",target:"Faculty of Natural Resources", targetType: "Movie",type:"Side"},
      {source:"Hatyai", sourceType: "Character",target:"Faculty of Agro_Industry", targetType: "Movie",type:"Side"},
      {source:"Hatyai", sourceType: "Character",target:"Faculty of Environment Management", targetType: "Movie",type:"Side"},
      {source:"Hatyai", sourceType: "Character",target:"Faculty of Medicine", targetType: "Movie",type:"Side"},
      {source:"Hatyai", sourceType: "Character",target:"Faculty of Nursing", targetType: "Movie",type:"Side"},
      {source:"Hatyai", sourceType: "Character",target:"International College Hatyai Campus", targetType: "Movie",type:"Side"},
      {source:"Hatyai", sourceType: "Character",target:"Faculty of Dentistry", targetType: "Movie",type:"Side"},
      {source:"Hatyai", sourceType: "Character",target:"Pharmaceutical Sciences", targetType: "Movie",type:"Side"},
      {source:"Hatyai", sourceType: "Character",target:"Faculty of Management Sciences", targetType: "Movie",type:"Side"},
      {source:"Hatyai", sourceType: "Character",target:"Faculty of Liberal Arts", targetType: "Movie",type:"Side"},
      {source:"Hatyai", sourceType: "Character",target:"Bachelor of Economics", targetType: "Movie",type:"Side"},
      {source:"Hatyai", sourceType: "Character",target:"Faculty of Law", targetType: "Movie",type:"Side"},
      {source:"Hatyai", sourceType: "Character",target:"Faculty of Traditional", targetType: "Movie",type:"Side"},
      {source:"Hatyai", sourceType: "Character",target:"Bachelor of Science", targetType: "Movie",type:"Side"},
      {source:"Hatyai", sourceType: "Character",target:"Faculty of Veterinary Science", targetType: "Movie",type:"Side"},

      {source:"Pattani", sourceType: "Character",target:"Faculty of Education", targetType: "Movie",type:"Side"},
      {source:"Pattani", sourceType: "Character",target:"Faculty of Humanities and Social Sciences", targetType: "Movie",type:"Side"},
      {source:"Pattani", sourceType: "Character",target:"Faculty of Science and Technology", targetType: "Movie",type:"Side"},
      {source:"Pattani", sourceType: "Character",target:"Faculty of Fine and Applied Arts", targetType: "Movie",type:"Side"},
      {source:"Pattani", sourceType: "Character",target:"Com_Sci", targetType: "Movie",type:"Side"},
      {source:"Pattani", sourceType: "Character",target:"Faculty of Political Science", targetType: "Movie",type:"Side"},
      {source:"Pattani", sourceType: "Character",target:"College of Islamic Studies", targetType: "Movie",type:"Side"},
      {source:"Pattani", sourceType: "Character",target:"Bachelor of Nursing Science", targetType: "Movie",type:"Side"},

      {source:"Phuket", sourceType: "Character",target:"Faculty of Hospitality and Tourism", targetType: "Movie",type:"Side"},
      {source:"Phuket", sourceType: "Character",target:"Faculty of Technology and Environment", targetType: "Movie",type:"Side"},
      {source:"Phuket", sourceType: "Character",target:"College of Computing", targetType: "Movie",type:"Side"},
      {source:"Phuket", sourceType: "Character",target:"Faculty of International Studies", targetType: "Movie",type:"Side"},

      {source:"Suratthani", sourceType: "Character",target:"Faculty of Science and Industrial Technology", targetType: "Movie",type:"Side"},

      {source:"Trang", sourceType: "Character",target:"Faculty of Commerce and Management", targetType: "Movie",type:"Side"},
      {source:"Trang", sourceType: "Character",target:"Faculty of Architecture", targetType: "Movie",type:"Side"},
    
      ];
  });