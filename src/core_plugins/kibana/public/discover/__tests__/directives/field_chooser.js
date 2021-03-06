import angular from 'angular';
import ngMock from 'ng_mock';
import _ from 'lodash';
import sinon from 'sinon';
import expect from 'expect.js';
import $ from 'jquery';
import 'ui/private';
import '../../components/field_chooser/field_chooser';
import FixturesHitsProvider from 'fixtures/hits';
import FixturesStubbedLogstashIndexPatternProvider from 'fixtures/stubbed_logstash_index_pattern';
import { SavedObject } from 'ui/saved_objects';

// Load the kibana app dependencies.

let $parentScope;
let $scope;
let hits;
let indexPattern;
let indexPatternList;

// Sets up the directive, take an element, and a list of properties to attach to the parent scope.
const init = function ($elem, props) {
  ngMock.inject(function ($rootScope, $compile, $timeout) {
    $parentScope = $rootScope;
    _.assign($parentScope, props);
    $compile($elem)($parentScope);

    // Required for test to run solo. Sigh
    $timeout(() => $elem.scope().$digest(), 0);

    $scope = $elem.isolateScope();
  });
};

const destroy = function () {
  $scope.$destroy();
  $parentScope.$destroy();
};

describe('discover field chooser directives', function () {
  const $elem = angular.element(`
    <disc-field-chooser
      columns="columns"
      toggle="toggle"
      hits="hits"
      field-counts="fieldCounts"
      index-pattern="indexPattern"
      index-pattern-list="indexPatternList"
      state="state"
      on-add-field="addField"
      on-add-filter="addFilter"
      on-remove-field="removeField"
    ></disc-field-chooser>
  `);

  beforeEach(ngMock.module('kibana', ($provide) => {
    $provide.decorator('config', ($delegate) => {
      // disable shortDots for these tests
      $delegate.get = _.wrap($delegate.get, function (origGet, name) {
        if (name === 'shortDots:enable') {
          return false;
        } else {
          return origGet.call(this, name);
        }
      });

      return $delegate;
    });
  }));

  beforeEach(ngMock.inject(function (Private) {
    hits = Private(FixturesHitsProvider);
    indexPattern = Private(FixturesStubbedLogstashIndexPatternProvider);
    indexPatternList = [
      new SavedObject(undefined, { id: '0', attributes: { title: 'b' } }),
      new SavedObject(undefined, { id: '1', attributes: { title: 'a' } }),
      new SavedObject(undefined, { id: '2', attributes: { title: 'c' } })
    ];

    const fieldCounts = _.transform(hits, function (counts, hit) {
      _.keys(indexPattern.flattenHit(hit)).forEach(function (key) {
        counts[key] = (counts[key] || 0) + 1;
      });
    }, {});

    init($elem, {
      columns: [],
      toggle: sinon.spy(),
      hits: hits,
      fieldCounts: fieldCounts,
      addField: sinon.spy(),
      addFilter: sinon.spy(),
      indexPattern: indexPattern,
      indexPatternList: indexPatternList,
      removeField: sinon.spy(),
    });

    $scope.$digest();
  }));

  afterEach(() => destroy());

  const getSections = function (ctx) {
    return {
      selected: $('.discover-selected-fields', ctx),
      popular: $('.discover-popular-fields', ctx),
      unpopular: $('.discover-unpopular-fields', ctx),
    };
  };

  describe('Index list', function () {
    it('should be in alphabetical order', function () {
      $elem.find('.ui-select-toggle').click();
      expect($elem.find('[role=option]').text().replace(/\W+/g, '')).to.be('abc');
    });
  });

  describe('Field listing', function () {
    it('should have Selected Fields, Fields and Popular Fields sections', function () {
      const headers = $elem.find('.sidebar-list-header');
      expect(headers.length).to.be(3);
    });

    it('should have 2 popular fields, 1 unpopular field and no selected fields', function () {
      const section = getSections($elem);
      const popular = find('popular');
      const unpopular = find('unpopular');

      expect(section.selected.find('li').length).to.be(0);

      expect(popular).to.contain('ssl');
      expect(popular).to.contain('@timestamp');
      expect(popular).to.not.contain('ip\n');

      expect(unpopular).to.contain('extension');
      expect(unpopular).to.contain('machine.os');
      expect(unpopular).to.not.contain('ssl');

      function find(popularity) {
        return section[popularity]
          .find('.discover-field-name')
          .map((i, el) => $(el).text())
          .toArray();
      }
    });


    it('should show the popular fields header if there are popular fields', function () {
      const section = getSections($elem);
      expect(section.popular.hasClass('ng-hide')).to.be(false);
      expect(section.popular.find('li:not(.sidebar-list-header)').length).to.be.above(0);
    });

    it('should not show the popular fields if there are not any', function () {

      // Re-init
      destroy();

      _.each(indexPattern.fields, function (field) { field.$$spec.count = 0; }); // Reset the popular fields
      init($elem, {
        columns: [],
        toggle: sinon.spy(),
        hits: require('fixtures/hits'),
        filter: sinon.spy(),
        indexPattern: indexPattern
      });

      const section = getSections($elem);

      $scope.$digest();
      expect(section.popular.hasClass('ng-hide')).to.be(true);
      expect(section.popular.find('li:not(.sidebar-list-header)').length).to.be(0);
    });

    it('should move the field into selected when it is added to the columns array', function () {
      const section = getSections($elem);
      $scope.columns.push('bytes');
      $scope.$digest();

      expect(section.selected.text()).to.contain('bytes');
      expect(section.popular.text()).to.not.contain('bytes');

      $scope.columns.push('ip');
      $scope.$digest();
      expect(section.selected.text()).to.contain('ip\n');
      expect(section.unpopular.text()).to.not.contain('ip\n');

      expect(section.popular.text()).to.contain('ssl');
    });
  });

  describe('details processing', function () {
    let field;
    function getField() { return _.find($scope.fields, { name: 'bytes' }); }

    beforeEach(function () {
      field = getField();
    });

    it('should have a computeDetails function', function () {
      expect($scope.computeDetails).to.be.a(Function);
    });

    it('should increase the field popularity when called', function () {
      indexPattern.popularizeField = sinon.spy();
      $scope.computeDetails(field);
      expect(indexPattern.popularizeField.called).to.be(true);
    });

    it('should append a details object to the field', function () {
      $scope.computeDetails(field);
      expect(field.details).to.not.be(undefined);
    });

    it('should delete the field details if they already exist', function () {
      $scope.computeDetails(field);
      expect(field.details).to.not.be(undefined);
      $scope.computeDetails(field);
      expect(field.details).to.be(undefined);
    });

    it('... unless recompute is true', function () {
      $scope.computeDetails(field);
      expect(field.details).to.not.be(undefined);
      $scope.computeDetails(field, true);
      expect(field.details).to.not.be(undefined);
    });

    it('should create buckets with formatted and raw values', function () {
      $scope.computeDetails(field);
      expect(field.details.buckets).to.not.be(undefined);
      expect(field.details.buckets[0].value).to.be(40.141592);
      expect(field.details.buckets[0].display).to.be('40.142');
    });


    it('should recalculate the details on open fields if the hits change', function () {
      $scope.hits = [
        { _source: { bytes: 1024 } }
      ];
      $scope.$apply();

      field = getField();
      $scope.computeDetails(field);
      expect(getField().details.total).to.be(1);

      $scope.hits = [
        { _source: { notbytes: 1024 } }
      ];
      $scope.$apply();
      field = getField();
      expect(field.details).to.not.have.property('total');
    });
  });
});
