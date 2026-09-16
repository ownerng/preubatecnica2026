package com.example.portal;

import java.util.Comparator;
import java.util.List;
import java.util.Optional;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import com.example.portal.model.Note;
import com.example.portal.model.User;

import software.amazon.awssdk.enhanced.dynamodb.DynamoDbEnhancedClient;
import software.amazon.awssdk.enhanced.dynamodb.DynamoDbIndex;
import software.amazon.awssdk.enhanced.dynamodb.DynamoDbTable;
import software.amazon.awssdk.enhanced.dynamodb.Key;
import software.amazon.awssdk.enhanced.dynamodb.TableSchema;
import software.amazon.awssdk.enhanced.dynamodb.model.CreateTableEnhancedRequest;
import software.amazon.awssdk.enhanced.dynamodb.model.EnhancedGlobalSecondaryIndex;
import software.amazon.awssdk.enhanced.dynamodb.model.QueryConditional;
import software.amazon.awssdk.services.dynamodb.DynamoDbClient;
import software.amazon.awssdk.services.dynamodb.model.Projection;
import software.amazon.awssdk.services.dynamodb.model.ProjectionType;
import software.amazon.awssdk.services.dynamodb.model.ProvisionedThroughput;

/** Acceso a DynamoDB para las dos tablas. Tablas pequeñas: scan es suficiente. */
@Component
public class Store {

    private final DynamoDbClient raw;
    private final DynamoDbTable<User> users;
    private final DynamoDbTable<Note> notes;

    public Store(DynamoDbClient raw, DynamoDbEnhancedClient enhanced,
                 @Value("${USERS_TABLE:Users}") String usersTable,
                 @Value("${NOTES_TABLE:Notes}") String notesTable) {
        this.raw = raw;
        this.users = enhanced.table(usersTable, TableSchema.fromBean(User.class));
        this.notes = enhanced.table(notesTable, TableSchema.fromBean(Note.class));
    }

    // ---- usuarios ----
    public List<User> allUsers() {
        return users.scan().items().stream()
                .sorted(Comparator.comparing(User::getCreatedAt, Comparator.nullsLast(Comparator.naturalOrder())))
                .toList();
    }

    public Optional<User> user(String id) {
        return Optional.ofNullable(users.getItem(Key.builder().partitionValue(id).build()));
    }

    public Optional<User> userByEmail(String email) {
        DynamoDbIndex<User> index = users.index("email-index");
        return index.query(r -> r.queryConditional(QueryConditional.keyEqualTo(k -> k.partitionValue(email))))
                .stream()
                .flatMap(page -> page.items().stream())
                .findFirst();
    }

    public void save(User user) {
        users.putItem(user);
    }

    public long activeAdmins() {
        return users.scan().items().stream().filter(u -> u.isActive() && u.isAdmin()).count();
    }

    // ---- notas ----
    public List<Note> allNotes() {
        return notes.scan().items().stream()
                .sorted(Comparator.comparing(Note::getCreatedAt, Comparator.nullsLast(Comparator.naturalOrder())))
                .toList();
    }

    public Optional<Note> note(String id) {
        return Optional.ofNullable(notes.getItem(Key.builder().partitionValue(id).build()));
    }

    public void save(Note note) {
        notes.putItem(note);
    }

    public void deleteNote(String id) {
        notes.deleteItem(Key.builder().partitionValue(id).build());
    }

    // ---- creación de tablas (solo local, CREATE_TABLES=true) ----
    public void createTablesIfMissing() {
        List<String> existing = raw.listTables().tableNames();
        if (!existing.contains(users.tableName())) {
            users.createTable(CreateTableEnhancedRequest.builder()
                    .provisionedThroughput(throughput())
                    .globalSecondaryIndices(EnhancedGlobalSecondaryIndex.builder()
                            .indexName("email-index")
                            .projection(Projection.builder().projectionType(ProjectionType.ALL).build())
                            .provisionedThroughput(throughput())
                            .build())
                    .build());
        }
        if (!existing.contains(notes.tableName())) {
            notes.createTable(CreateTableEnhancedRequest.builder()
                    .provisionedThroughput(throughput())
                    .build());
        }
        raw.waiter().waitUntilTableExists(b -> b.tableName(users.tableName()));
        raw.waiter().waitUntilTableExists(b -> b.tableName(notes.tableName()));
    }

    private static ProvisionedThroughput throughput() {
        return ProvisionedThroughput.builder().readCapacityUnits(5L).writeCapacityUnits(5L).build();
    }

    public boolean usersEmpty() {
        return users.scan(r -> r.limit(1)).items().stream().findAny().isEmpty();
    }
}
